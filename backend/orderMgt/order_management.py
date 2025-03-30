# order_management.py
import json
import threading
import time
from flask import Flask, request, jsonify
import requests
import firebase_admin
from firebase_admin import credentials, firestore
import pika

# -----------------------------
# Initialize Flask Application
# -----------------------------
app = Flask(__name__)

# -----------------------------
# Firebase Initialization
# -----------------------------
# Replace 'path/to/serviceAccountKey.json' with the actual path to your Firebase service account key file.
cred = credentials.Certificate("path/to/serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# -----------------------------
# RabbitMQ (Message Broker) Settings
# -----------------------------
rabbitmq_host = "localhost"  # Change to your broker's host if different
rabbitmq_exchange_payment = "paymentTopic"  # For payment outcomes (dashed line: asynchronous)
rabbitmq_exchange_queue = "queueTopic"      # For publishing new orders to Queue Management
rabbitmq_exchange_notif = "notifTopic"        # For sending notifications to the Notif service
rabbitmq_queue_payment_outcome = "order_mgmt_payment_outcome"

# -----------------------------
# RabbitMQ Publisher Utility
# -----------------------------
def get_rabbitmq_channel():
    """
    Establish a new RabbitMQ connection and return the connection and channel.
    """
    connection = pika.BlockingConnection(pika.ConnectionParameters(host=rabbitmq_host))
    channel = connection.channel()
    return connection, channel

def publish_message(exchange, routing_key, message):
    """
    Publish a JSON message to a given exchange with a specific routing key.
    """
    connection, channel = get_rabbitmq_channel()
    channel.exchange_declare(exchange=exchange, exchange_type='topic')
    channel.basic_publish(
        exchange=exchange,
        routing_key=routing_key,
        body=json.dumps(message)
    )
    connection.close()
    print(f"Published message to exchange '{exchange}' with routing key '{routing_key}': {message}")

# -----------------------------
# Firebase Order Data Helpers
# -----------------------------
def update_order_status(order_id, status):
    """
    Update the order document in Firebase with the new status.
    """
    order_ref = db.collection("orders").document(order_id)
    order_ref.update({"status": status})
    print(f"Order {order_id} updated to status {status}")

# -----------------------------
# Asynchronous Publish Functions
# -----------------------------
def publish_to_queue_management(order_id):
    """
    Retrieve the order details from Firebase and publish a message to the Queue Management service.
    """
    order_ref = db.collection("orders").document(order_id).get()
    if order_ref.exists:
        order_data = order_ref.to_dict()
        payload = {
            "hawkerCentre": "Maxwell Food Centre",
            "orderId": order_id,
            "email": order_data.get("email"),
            "userId": order_data.get("userId"),
            "paymentStatus": "paid",
            "stalls": order_data.get("stalls")
        }
        publish_message(rabbitmq_exchange_queue, "queue.newOrder", payload)
    else:
        print(f"Order {order_id} not found for Queue Management publishing.")

def publish_to_notif(order_id):
    """
    Retrieve the order details from Firebase and publish a notification message.
    """
    order_ref = db.collection("orders").document(order_id).get()
    if order_ref.exists:
        order_data = order_ref.to_dict()
        payload = {
            "emailID": order_data.get("email"),
            "orderId": order_id,
            "paymentStatus": order_data.get("status")
        }
        publish_message(rabbitmq_exchange_notif, "notif.email", payload)
    else:
        print(f"Order {order_id} not found for notification publishing.")

# -----------------------------
# RabbitMQ Consumer for Payment Outcome
# -----------------------------
def on_payment_outcome(ch, method, properties, body):
    """
    Callback function that processes incoming payment outcome messages.
    Expected message format:
      {
        "orderId": "order_001",
        "paymentStatus": "success"  // or "failed"
      }
    """
    try:
        data = json.loads(body)
        order_id = data.get("orderId")
        payment_status = data.get("paymentStatus")
        print(f"Received payment outcome for order {order_id}: {payment_status}")
        
        # Update the order status in Firebase
        update_order_status(order_id, payment_status)
        
        # If payment succeeded, publish messages to Queue Management and Notif services
        if payment_status == "success":
            publish_to_queue_management(order_id)
            publish_to_notif(order_id)
        else:
            # For failure, simply notify the customer via Notif service
            publish_to_notif(order_id)
    except Exception as e:
        print("Error processing payment outcome:", e)

def start_payment_consumer():
    """
    Start a RabbitMQ consumer to listen for payment outcome messages.
    """
    connection = pika.BlockingConnection(pika.ConnectionParameters(host=rabbitmq_host))
    channel = connection.channel()
    channel.exchange_declare(exchange=rabbitmq_exchange_payment, exchange_type='topic')
    channel.queue_declare(queue=rabbitmq_queue_payment_outcome)
    channel.queue_bind(exchange=rabbitmq_exchange_payment, queue=rabbitmq_queue_payment_outcome, routing_key="payment.outcome")
    channel.basic_consume(queue=rabbitmq_queue_payment_outcome, on_message_callback=on_payment_outcome, auto_ack=True)
    print("Started RabbitMQ consumer for payment outcomes")
    channel.start_consuming()

# Start the RabbitMQ consumer in a background thread
consumer_thread = threading.Thread(target=start_payment_consumer, daemon=True)
consumer_thread.start()

# -----------------------------
# Flask REST Endpoints
# -----------------------------
@app.route("/order", methods=["POST"])
def create_order():
    """
    Endpoint: POST /order
    Purpose:
      - Receive a new order request from the Customer UI.
      - Validate the JSON payload and extract user and order details.
      - Persist the order to Firebase with an initial status of "pending".
      - Compute the total payment amount (here, simplified as a fixed value).
      - Make a synchronous HTTP call to the Payment service.
      - Return a response with the order ID and pending status.
    """
    try:
        order_request = request.get_json()
        if not order_request:
            return jsonify({"message": "Invalid request, JSON required"}), 400

        # Extract order details
        user_id = order_request.get("userId")
        email = order_request.get("email")
        stalls = order_request.get("stalls")
        if not user_id or not email or not stalls:
            return jsonify({"message": "Missing required fields"}), 400

        # Generate an order ID (using a timestamp for simplicity)
        order_id = f"order_{int(time.time())}"

        # Create the order in Firebase with a "pending" status
        order_data = {
            "orderId": order_id,
            "userId": user_id,
            "email": email,
            "stalls": stalls,
            "status": "pending"
        }
        db.collection("orders").document(order_id).set(order_data)
        print(f"Created order {order_id} in Firebase.")

        # Compute total payment amount (for demo purposes, we use a fixed amount)
        total_amount = 10.0  # In a real scenario, sum up the prices based on the order details

        # Synchronously call the Payment microservice
        payment_payload = {
            "paymentAmount": total_amount,
            "orderId": order_id,
            "userId": user_id
        }
        try:
            # Replace the URL below with your Payment service endpoint.
            payment_response = requests.post("http://localhost:5001/processPayment", json=payment_payload, timeout=5)
            print(f"Payment service response: {payment_response.status_code}")
        except Exception as e:
            print(f"Error calling Payment service: {e}")

        # Return the pending status to the Customer UI
        return jsonify({"orderId": order_id, "status": "pending"}), 200

    except Exception as e:
        print("Error in create_order:", e)
        return jsonify({"message": "Internal server error"}), 500

@app.route("/order/status/<string:order_id>", methods=["GET"])
def get_order_status(order_id):
    """
    Endpoint: GET /order/status/<order_id>
    Purpose:
      - Retrieve the current status of the order from Firebase.
      - Return the order ID and its status to the caller.
    """
    try:
        order_ref = db.collection("orders").document(order_id).get()
        if order_ref.exists:
            order_data = order_ref.to_dict()
            return jsonify({
                "orderId": order_id,
                "status": order_data.get("status", "unknown")
            }), 200
        else:
            return jsonify({"message": "Order not found"}), 404
    except Exception as e:
        print("Error in get_order_status:", e)
        return jsonify({"message": "Internal server error"}), 500

if __name__ == "__main__":
    # Run the Flask app on host 0.0.0.0 and port 5000.
    app.run(host="0.0.0.0", port=5000, debug=True)
