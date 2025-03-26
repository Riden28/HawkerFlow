from flask import Flask
from payment.controllers import payment_bp

def create_app():
    app = Flask(__name__)
    
    # Register Blueprints
    app.register_blueprint(payment_bp, url_prefix='/api/payment')

    # Additional configuration (e.g., DB, logging) can be set here
    return app

if __name__ == '__main__':
    flask_app = create_app()
    # Run in debug mode for development. In production, use a WSGI server like gunicorn.
    flask_app.run(host='0.0.0.0', port=5000, debug=True)
