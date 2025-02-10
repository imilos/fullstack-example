from datetime import datetime, timedelta
from flask import Flask, redirect, request, url_for, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_restful import Api, Resource
from flask_cors import CORS
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy.exc import IntegrityError
import jwt
from flask_migrate import Migrate
from functools import wraps

app = Flask(__name__)
CORS(app)  # Allow CORS for all routes
api = Api(app)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///customers.db'  # Update this for your database
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = '122233mkdsjadkasdk'  # Needed for Flask-Login

db = SQLAlchemy(app)
login_manager = LoginManager(app)

migrate = Migrate(app, db)

# Models
class Customer(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    user = db.relationship('User', backref=db.backref('customers', lazy=True))    

class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)

# Flask-Login user loader
@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Validation function for customers
def validate_customer(data, customer_id=None):
    errors = {}
    
    if 'name' not in data or not isinstance(data['name'], str) or len(data['name']) > 255:
        errors['name'] = 'Name is required and must be a string with a maximum of 255 characters.'

    if 'email' not in data or not isinstance(data['email'], str) or len(data['email']) > 255:
        errors['email'] = 'Email is required and must be a string with a maximum of 255 characters.'
    else:
        existing_customer = Customer.query.filter_by(email=data['email']).first()
        if existing_customer and (customer_id is None or existing_customer.id != customer_id):
            errors['email'] = 'Email must be unique.'

    return errors


def token_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        # Check if the token is provided in the request headers
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(" ")[1]  # Extract token after 'Bearer '
        
        if not token:
            return {'message': 'Token is missing!'}, 403

        try:
            # Decode the token using the SECRET_KEY
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = User.query.get(data['id'])  # Retrieve the user by ID from the token
            if not current_user:
                raise Exception("User not found")
        except Exception as e:
            return {'message': 'Token is invalid or expired!', 'error': str(e)}, 403
        
        # Attach the user to the request
        request.current_user = current_user
        return f(*args, **kwargs)

    return decorated_function


#
# Customer API resources
#
class CustomerListResource(Resource):

    @token_required
    def get(self):
        current_user_id = request.current_user.id
        # Get query parameters for paging
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)

        # Paginate the query
        customers_query = Customer.query.filter_by(user_id=current_user_id).paginate(
            page=page, per_page=per_page, error_out=False)
        #customers_query = Customer.query.paginate(page=page, per_page=per_page, error_out=False)
        customers = customers_query.items

        # Prepare the response
        return {
            'status': True,
            'message': 'Customers retrieved successfully',
            'data': [{'id': c.id, 'name': c.name, 'email': c.email} for c in customers],
            'paging': {
                'page': customers_query.page,
                'per_page': customers_query.per_page,
                'total_pages': customers_query.pages,
                'total_items': customers_query.total
            }
        }
        
    @token_required
    def post(self):
        current_user_id = request.current_user.id
        data = request.get_json()
        errors = validate_customer(data)
        if errors:
            return {
                'status': False,
                'message': 'Validation error',
                'errors': errors
            }, 422

        try:
            customer = Customer(name=data['name'], email=data['email'], user_id=current_user_id)
            db.session.add(customer)
            db.session.commit()
            return {
                'status': True,
                'message': 'Customer created successfully',
                'data': {'id': customer.id, 'name': customer.name, 'email': customer.email}
            }, 201
        except IntegrityError:
            db.session.rollback()
            return {
                'status': False,
                'message': 'Email must be unique.'
            }, 422

class CustomerResource(Resource):
    
    @token_required
    def get(self, customer_id):
        current_user_id = request.current_user.id
        #customer = Customer.query.get_or_404(customer_id)
        customer = Customer.query.filter_by(id=customer_id, user_id=current_user_id).first_or_404()
        return {
            'status': True,
            'message': 'Customer found successfully',
            'data': {'id': customer.id, 'name': customer.name, 'email': customer.email}
        }

    
    @token_required
    def put(self, customer_id):
        current_user_id = request.current_user.id
        customer = Customer.query.filter_by(id=customer_id, user_id=current_user_id).first_or_404()

        data = request.get_json()
        errors = validate_customer(data, customer_id)
        if errors:
            return {
                'status': False,
                'message': 'Validation error',
                'errors': errors
            }, 422

        customer.name = data['name']
        customer.email = data['email']
        db.session.commit()

        return {
            'status': True,
            'message': 'Customer updated successfully',
            'data': {'id': customer.id, 'name': customer.name, 'email': customer.email}
        }

    @token_required
    def delete(self, customer_id):
        current_user_id = request.current_user.id
        #customer = Customer.query.get_or_404(customer_id)
        customer = Customer.query.filter_by(id=customer_id, user_id=current_user_id).first_or_404()
        db.session.delete(customer)
        db.session.commit()
        return {
            'status': True,
            'message': 'Customer deleted successfully'
        }, 204

# Authentication API resources
class RegisterResource(Resource):
    def post(self):
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return {
                'status': False,
                'message': 'Email and password are required.'
            }, 400
        
        if len(password) < 6:
            return {
                'status': False,
                'message': 'Password must be at least 6 characters long.'
            }, 400
        
        hashed_password = generate_password_hash(password)
        new_user = User(email=email, password=hashed_password)
        
        try:
            db.session.add(new_user)
            db.session.commit()
            return {
                'status': True,
                'message': 'User registered successfully.'
            }, 201
        except IntegrityError:
            db.session.rollback()
            return {
                'status': False,
                'message': 'Email already exists.'
            }, 400

class LoginResource(Resource):
    def post(self):
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')

        if not email or not password:
            return {
                'status': False,
                'message': 'Email and password are required.'
            }, 400

        user = User.query.filter_by(email=email).first()
        if user and check_password_hash(user.password, password):
            login_user(user)  # Log the user in with Flask-Login

            # Generate the JWT token
            token = jwt.encode(
                {
                    'id': user.id,
                    'email': user.email,
                    'exp': datetime.utcnow() + timedelta(hours=2)  # Token expires in 2 hours
                },
                app.config['SECRET_KEY']
            )

            return {
                'status': True,
                'message': 'Login successful.',
                'data': {
                    'id': user.id,
                    'email': user.email,
                    'token': token  # Include the JWT token
                }
            }
        else:
            return {
                'status': False,
                'message': 'Invalid email or password.'
            }, 401


class LogoutResource(Resource):
    #@login_required
    def post(self):
        logout_user()
        return {
            'status': True,
            'message': 'Logout successful.'
        }

class ProfileResource(Resource):
    @login_required
    def get(self):
        return {
            'status': True,
            'message': 'User profile retrieved successfully.',
            'data': {'id': current_user.id, 'email': current_user.email}
        }

# Register routes
api.add_resource(RegisterResource, '/api/auth/register')
api.add_resource(LoginResource, '/api/auth/login')
api.add_resource(LogoutResource, '/api/auth/logout')
api.add_resource(ProfileResource, '/api/auth/profile')

api.add_resource(CustomerListResource, '/api/customers')
api.add_resource(CustomerResource, '/api/customers/<int:customer_id>')

if __name__ == '__main__':
    with app.app_context():
        db.create_all()  # Ensure the database tables are created
    app.run(debug=True, port=8000)
