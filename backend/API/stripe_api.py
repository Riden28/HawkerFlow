import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
from invokes import invoke_http
import stripe
load_dotenv()

#import key 
stripe.api_key = os.getenv("STRIPE_API_KEY")

app = Flask(__name__)
CORS(app)

#to do: 
#1. input port and host at the bottom
#2. insert error handling for rejection of card details

"""
    data = {
        "paymentAmount":int,
        "card_no":"4242424242424242",
        "exp_date":"10/26",
        "cvc":"017"    
    }
"""


@app.route('/api/stripepay', methods=['POST'])
#create payment method and intent to immediately pay
def stripepay():
    data = request.get_json()
    # split the exp_date into month and year
    exp_date = data['exp_date'].split('/')
    
    # create a paymentmethod  
    paymentmethod = stripe.PaymentMethod.create(
        type="card",
        card={
            "number": data["card_no"],
            "exp_month": int(exp_date[0]),
            "exp_year": int(exp_date[1]),
            "cvc": data["cvc"],
        }
    )
    
    """
    response:
        {
            "id":"string",...
        }
        
    """
    #create a paymentintent and make payment straight away
    try:
        result = stripe.PaymentIntent.create(
            #paymentAmount in cents
            amount=int(data["paymentAmount"] * 100),
            currency='sgd',
            confirm=True,
            payment_method=paymentmethod["id"])
        print(result)
        return jsonify({"code":200, "data":result}), 200
    except Exception as e:
        print(e)
        return jsonify({"code":400, "data":{"message": f'{e}', "status": "failed"}}), 400

if __name__ == "__main__":
    #insert port and host
    "app.run(debug=True, port=xxxx, host='0.0.0.0')"


