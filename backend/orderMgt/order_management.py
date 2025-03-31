import os
import json
import time
import threading
from flask import Flask, request, jsonify
import requests
import pika
from dotenv import load_dotenv
from google.cloud import firestore
from google.oauth2 import service_account

# Load environment variables from a .env file
load_dotenv(dotenv_path='.env')

app = Flask(__name__)

# Retrieve Firebase credentials from environment variables
service_account_path = os.environ.get("FIREBASE_SERVICE_ACCOUNT_KEY_PATH")
project_id = os.environ.get("FIREBASE_PROJECT_ID")
if not service_account_path or not project_id:
    raise ValueError("Required environment variables (FIREBASE_SERVICE_ACCOUNT_KEY_PATH, FIREBASE_PROJECT_ID) are not set.")

# Create credentials and initialize Firestore
cred = service_account.Credentials.from_service_account_file(service_account_path)
db = firestore.Client(project=project_id, credentials=cred, database='order')

# RabbitMQ configuration
RABBITMQ_HOST = os.environ.get("RABBITMQ_HOST", "rabbitmq")  # Default to 'rabbitmq' if not set
PAYMENT_OUTCOME_QUEUE = "order_mgmt_payment_outcome"
PAYMENT_EXCHANGE = "paymentTopic"
QUEUE_EXCHANGE = "queueTopic"
NOTIF_EXCHANGE = "notifTopic"

def get_rabbitmq_channel():
    """Establish a RabbitMQ connection and return the connection and channel."""
    connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_HOST))
    channel = connection.channel()
    return connection, channel

def publish_message(exchange, routing_key, message):
    """Publish a JSON message to a specified exchange with a routing key."""
    connection, channel = get_rabbitmq_channel()
    channel.exchange_declare(exchange=exchange, exchange_type='topic')
    channel.basic_publish(
        exchange=exchange,
        routing_key=routing_key,
        body=json.dumps(message)
    )
    connection.close()
    print(f"Published message to exchange '{exchange}' with routing key '{routing_key}': {message}")

def update_order_status(order_id, status):
    """Update the status field for an order document in Firestore."""
    order_ref = db.collection("orders").document(order_id)
    order_ref.update({"status": status})
    print(f"Order {order_id} updated to status {status}")

def publish_to_queue_management(order_id):
    """Publish order details to the Queue Management service."""
    order_ref = db.collection("orders").document(order_id).get()
    if order_ref.exists:
        order_data = order_ref.to_dict()
        payload = {
            "hawkerCentre": order_data.get("hawkerCentre", "Default Centre"),
            "orderId": order_id,
            "email": order_data.get("email"),
            "userId": order_data.get("userId"),
            "paymentStatus": "paid",
            "stalls": order_data.get("stalls")
        }
        publish_message(QUEUE_EXCHANGE, "queue.newOrder", payload)
    else:
        print(f"Order {order_id} not found for Queue Management publishing.")

def publish_to_notif(order_id):
    """Publish a notification message to the Notif service."""
    order_ref = db.collection("orders").document(order_id).get()
    if order_ref.exists:
        order_data = order_ref.to_dict()
        payload = {
            "emailID": order_data.get("email"),
            "orderId": order_id,
            "paymentStatus": order_data.get("status")
        }
        publish_message(NOTIF_EXCHANGE, "notif.email", payload)
    else:
        print(f"Order {order_id} not found for notification publishing.")

def on_payment_outcome(ch, method, properties, body):
    """
    Callback function for processing payment outcome messages.
    Expected message format:
      {
         "orderId": "order_001",
         "paymentStatus": "success"   // or "failed"
      }
    """
    try:
        data = json.loads(body)
        order_id = data.get("orderId")
        payment_status = data.get("paymentStatus")
        print(f"Received payment outcome for order {order_id}: {payment_status}")

        update_order_status(order_id, payment_status)

        if payment_status == "success":
            publish_to_queue_management(order_id)
            publish_to_notif(order_id)
        else:
            # Communicate failure directly to the customer via Notif
            publish_to_notif(order_id)
    except Exception as e:
        print("Error processing payment outcome:", e)

def start_payment_consumer():
    """Start a RabbitMQ consumer to listen for payment outcome messages."""
    connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_HOST))
    channel = connection.channel()
    channel.exchange_declare(exchange=PAYMENT_EXCHANGE, exchange_type='topic')
    channel.queue_declare(queue=PAYMENT_OUTCOME_QUEUE)
    channel.queue_bind(exchange=PAYMENT_EXCHANGE, queue=PAYMENT_OUTCOME_QUEUE, routing_key="payment.outcome")
    channel.basic_consume(queue=PAYMENT_OUTCOME_QUEUE, on_message_callback=on_payment_outcome, auto_ack=True)
    print("Started RabbitMQ consumer for payment outcomes")
    channel.start_consuming()

# Start RabbitMQ consumer in a background thread
consumer_thread = threading.Thread(target=start_payment_consumer, daemon=True)
consumer_thread.start()

@app.route("/order", methods=["POST"])
def create_order():
    """
    POST /order
    Accepts a new order, stores it in Firestore with a "pending" status,
    and makes a synchronous call to the Payment service.
    """
    try:
        order_request = request.get_json()
        if not order_request:
            return jsonify({"message": "Invalid JSON payload"}), 400

        user_id = order_request.get("userId")
        email = order_request.get("email")
        stalls = order_request.get("stalls")
        hawker_centre = order_request.get("hawkerCentre", "Default Centre")
        if not user_id or not email or not stalls:
            return jsonify({"message": "Missing required fields"}), 400

        # Generate an order ID using a timestamp (for demonstration)
        order_id = f"order_{int(time.time())}"

        order_data = {
            "orderId": order_id,
            "userId": user_id,
            "email": email,
            "stalls": stalls,
            "hawkerCentre": hawker_centre,
            "status": "pending"
        }
        db.collection("orders").document(order_id).set(order_data)
        print(f"Created order {order_id} in Firestore.")

        # Compute the total payment amount (for demo, we use a fixed value)
        total_amount = 10.0

        # Synchronously call the Payment service
        payment_payload = {
            "paymentAmount": total_amount,
            "orderId": order_id,
            "userId": user_id
        }
        try:
            # Update the URL as required for your Payment service
            payment_response = requests.post("http://localhost:5001/processPayment", json=payment_payload, timeout=5)
            print(f"Payment service response: {payment_response.status_code}")
        except Exception as e:
            print("Error calling Payment service:", e)

        return jsonify({"orderId": order_id, "status": "pending"}), 200

    except Exception as e:
        print("Error in create_order:", e)
        return jsonify({"message": "Internal server error"}), 500

@app.route("/order/status/<string:order_id>", methods=["GET"])
def get_order_status(order_id):
    """
    GET /order/status/<order_id>
    Retrieves the current status of an order from Firestore.
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
    app.run(host="0.0.0.0", port=5000, debug=True)
