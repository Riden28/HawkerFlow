import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
import stripe

#import key 


load_dotenv()
app = Flask(__name__)
CORS(app)

# stripe.api_key = "pk_test_51R80VkFKfP7LOez7sDTq82hBlhj8mZFJRFcFmb2Y35saQ1FVMVUIOdfX8EzGEsDRYReFZ3CKzP7lFeONCQL2XldX00o7spgvVN"
stripe.api_key = os.environ.get("STRIPE_API_KEY")
if not stripe.api_key:
    raise ValueError("StripE secret key is missing! Please set STRIPE_API_KEY in your environment.")

@app.route('/payment', methods=['POST'])
def payment():
    data = request.get_json()

    payment_amount = data.get("amount")
    token = data.get("token")
    id = token.get("id")
    type = token.get("type")

    try:
    # Step 1: Create a PaymentMethod using the token
        payment_method = stripe.PaymentMethod.create(
            type=type,
            card={"token": id}  #card is the parameter in the stripe.PaymentMethod function --> points to token id 
        )

        # Step 2: Create a PaymentIntent with the created PaymentMethod
        payment_intent = stripe.PaymentIntent.create(
            amount=int(payment_amount * 100),  # Convert to cents
            currency="sgd",
            payment_method=payment_method.id,  # Use the created PaymentMethod ID
            confirm=True, # Confirm the payment immediately
            automatic_payment_methods={"enabled": True, "allow_redirects": "never"}
        )
        print(payment_intent)
        # Return a success response
        return jsonify({
            "code": 200,
            "data": {"message": "Payment successful", "status": "success", "paymentIntent": payment_intent}
        }), 200

    except stripe.error.CardError as e:
        # Handle card error (e.g., insufficient funds, etc.)
        return jsonify({
            "code": 400,
            "data": {"message": f'{e}', "status": "failed"}
        }), 400
        
if __name__ == "__main__":
    #change port for full testing if needed
    app.run(debug=True, port=5002, host='0.0.0.0')