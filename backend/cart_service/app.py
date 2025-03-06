from flask import Flask
from cart.controllers import cart_bp

def create_app():
    app = Flask(__name__)
    
    # Register Blueprint
    app.register_blueprint(cart_bp, url_prefix='/api/cart')

    # Additional configuration (e.g., DB, logging) can be set here
    return app

if __name__ == '__main__':
    flask_app = create_app()
    flask_app.run(host='0.0.0.0', port=6000, debug=True)
