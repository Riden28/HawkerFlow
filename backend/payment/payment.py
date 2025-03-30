import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
import stripe

#import key 

#rmb to change to dot.env for 
#load_dotenv()
# stripe.api_key = os.getenv("STRIPE_API_KEY")
stripe.api_key = "sk_test_51R80VkFKfP7LOez7rS4YzRjqpzKZKFHVh2opY6BEEjMXzc5Agh6o6FRPgOaJLdI4vUxtORNbbiw4fGzAi5mVP0h800HUKmpr0Q"

app = Flask(__name__)
CORS(app)

@app.route('/payment', methods=['POST'])
def payment():
    data = request.get_json()

    payment_amount = data["paymentAmount"]
    token = data["token"]

    try:
        # Create a PaymentIntent using the test token
        payment_intent = stripe.PaymentIntent.create(
            amount=payment_amount * 100,  # Amount in cents (e.g., $10.00)
            currency="sgd",
            #change once frontend can deliver the token
            # payment_method=token_id,  # Use the test token ID here
            # confirm=True  # Confirm the payment immediately
            automatic_payment_methods={"enabled": True}
        )

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
    app.run(debug=True, port=5000, host='0.0.0.0')