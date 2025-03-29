import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
from invokes import invoke_http
import stripe
load_dotenv()


app = Flask(__name__)
CORS(app)

#to do: 
#1. input port and host at the bottom
"""
    data = {
        "paymentAmount":int,
        "card_no":"4242424242424242",
        "exp_date":"10/26",
        "cvc":"017"    
    }
"""

@app.route('/payment', methods=['POST'])
def payment():
    data = request.get_json()
    #insert error handling here before sending "good" data to stripe api microservice if needed
    result = invoke_http(os.environ.get("stripe_url"),
                            method='POST', json=data)
    
    if result["code"] == 200:
            return jsonify({
                "code": 200,
                "data": {"message": "Payment successful", "status": "success"}
            }), 200
    
if __name__ == "__main__":
    #insert port and host
    "app.run(debug=True, port=xxxx, host='0.0.0.0')"


