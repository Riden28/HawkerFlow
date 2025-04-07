import os
import time
import json
import requests
import pika
from flask import Flask, request, jsonify
from flask_cors import CORS

# Flask App Initialization
app = Flask(__name__)
CORS(app)

# Environment-Based Configuration
# Base URLs for outbound REST calls to other microservices.
# MENU_SERVICE_URL = os.environ.get("MENU_SERVICE_URL", "http:/localhost/menu:5001")
# PAYMENT_SERVICE_URL = os.environ.get("PAYMENT_SERVICE_URL", "http:/localhost/payment:5002")
MENU_SERVICE_URL = os.environ.get("MENU_SERVICE_URL", "http://localhost:5001")
PAYMENT_SERVICE_URL = os.environ.get("PAYMENT_SERVICE_URL", "http://localhost:5002")

# (Queue and Notification services will be notified via RabbitMQ.)
# RabbitMQ configuration for asynchronous messaging:
RABBITMQ_HOST = os.environ.get("RABBITMQ_HOST", "localhost")
EXCHANGE_NAME = 'order_exchange'  # Exchange name for publishing notifications

# Initialize RabbitMQ connection and channel.
try:
    connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_HOST,heartbeat=10000))
    channel = connection.channel()
    channel.exchange_declare(exchange=EXCHANGE_NAME, exchange_type='topic', durable=True)
    print("RabbitMQ connection established and exchange declared.")
except Exception as e:
    print(f"Error setting up RabbitMQ: {e}")
    channel = None

# In-memory storage for orders (for demonstration purposes)
orders = {}

# Utility function: Asynchronous Publisher via RabbitMQ
def publish_message(routing_key: str, message: dict):
    """
    Publishes a JSON message to the RabbitMQ exchange using the provided routing key.
    This message will be delivered asynchronously to the appropriate microservices.
    """
    try:
        if channel is None:
            print("RabbitMQ channel is not available.")
            return
        channel.basic_publish(
            exchange=EXCHANGE_NAME,
            routing_key=routing_key,
            body=json.dumps(message),
            properties=pika.BasicProperties(delivery_mode=2)  # persistent message
        )
        print(f"Published message with routing key '{routing_key}': {message}")
    except Exception as e:
        print(f"Failed to publish message: {e}")

# 1) Composite Endpoints to Retrieve Stall Lists and Menu Items (Proxy Calls)
###############################################################################

# Proxy GET /hawkerCenters
@app.route("/hawkerCenters", methods=["GET"])
def proxy_get_all_hawker_centers():
    url = f"{MENU_SERVICE_URL}/hawkerCenters"
    r = requests.get(url, timeout=5)
    if r.status_code == 200:
        return jsonify(r.json()), 200
    else:
        return jsonify({"error": f"Failed to retrieve hawker centers. Status code: {r.status_code}"}), r.status_code

# Proxy GET /hawkerCenters/<hawkerId>/stalls
@app.route("/hawkerCenters/<string:hawkerId>/stalls", methods=["GET"])
def proxy_get_stalls(hawkerId):
    url = f"{MENU_SERVICE_URL}/hawkerCenters/{hawkerId}/stalls"
    r = requests.get(url, timeout=5)
    if r.status_code == 200:
        return jsonify(r.json()), 200
    else:
        return jsonify({"error": f"Failed to retrieve stalls. Status code: {r.status_code}"}), r.status_code

# Proxy GET /hawkerCenters/<hawkerId>/stalls/<stallId>/dishes
@app.route("/hawkerCenters/<string:hawkerId>/stalls/<string:stallId>/dishes", methods=["GET"])
def proxy_get_dishes(hawkerId, stallId):
    url = f"{MENU_SERVICE_URL}/hawkerCenters/{hawkerId}/stalls/{stallId}/dishes"
    r = requests.get(url, timeout=5)
    if r.status_code == 200:
        return jsonify(r.json()), 200
    else:
        return jsonify({"error": f"Failed to retrieve dishes. Status code: {r.status_code}"}), r.status_code


# 2) POST /order - Accept Orders, Forward Payment Payload, and Publish Notifications
###############################################################################
@app.route("/order", methods=["POST"])
def create_order():
    try:
        order_request = request.get_json()
        if not order_request:
            return jsonify({"error": "Invalid JSON payload"}), 400

        user_id = order_request.get("userId")
        phone_number = order_request.get("phoneNumber")
        stalls_dict = order_request.get("stalls")
        token = order_request.get("token")
        amount = order_request.get("amount")
        hawker_center = order_request.get("hawkerCenter")
        order_id = order_request.get("orderId")
        
        if user_id is None or phone_number is None or stalls_dict is None or token is None or amount is None:
            return jsonify({"error": "Missing required fields: userId, phoneNumber, stalls, token are required."}), 400
        
        payment_payload = {
            "token":token,
            "amount":amount
        }

        #######################################################################
        # Forward Payment Information to PAYMENT Microservice
        #######################################################################
        # Outbound API Call: POST /processPayment on PAYMENT service.
        # We forward the payment payload (which includes fields like createdAt, phoneNumber, id, items, paymentMethod, token, total, etc.)
        try:
            payment_service_url = f"{PAYMENT_SERVICE_URL}/payment"
            payment_resp = requests.post(payment_service_url, json=payment_payload, timeout=5)
            if payment_resp.status_code == 200:
                payment_result = payment_resp.json()
                payment_data = payment_result.get("data", {})
                payment_status = payment_data.get("status", "success")
                print(f"PAYMENT service responded with status code: {payment_resp.status_code}")
            else:
                try:
                    payment_result = payment_resp.json()
                    payment_data = payment_result.get("data", {})
                    payment_status = payment_data.get("status", "failed")
                except Exception as e:
                    payment_status = "failed"
                print(f"PAYMENT service responded with status code: {payment_resp.status_code}")
        except Exception as e:
            print(f"Error calling PAYMENT microservice: {e}")
            payment_status = "failed"

        #######################################################################
        # Publish Notifications via RabbitMQ (Asynchronous Messaging)
        #######################################################################
        if payment_status == "success":
            # Build order notification payload for Queue Management.
            order_details = {
                "hawkerCenter": hawker_center,
                "orderId": order_id,
                "phoneNumber":phone_number,
                "userId": user_id,
                "paymentStatus": payment_status,
                "stalls": stalls_dict  # In a full implementation, detailed dish info could be included.
            }
            # Publish to Queue Management using routing key "<orderId>.queue"
            publish_message(f"{order_id}.queue", order_details)
            
            # Build notification payload for Notification service.
            notif_data = {
                "orderId": order_id,
                "userId": user_id,
                "phoneNumber": phone_number,
                "paymentStatus": payment_status
            }
            # Publish to Notification service using routing key "<orderId>.notif"
            publish_message(f"{order_id}.notif", notif_data)

        #######################################################################
        # Return Response to the Customer UI
        #######################################################################
        return jsonify({
            "orderId": order_id,
            "paymentStatus": payment_status
        }), 200

    except Exception as e:
        print(f"Error in create_order: {e}")
        return jsonify({"error": str(e)}), 500

# 3) GET /order/status/<orderId> - Retrieve Order Status
###############################################################################
@app.route("/order/status/<string:orderId>", methods=["GET"])
def get_order_status(orderId):
    """
    GET /order/status/<orderId>
    Returns the current status of the order from the in-memory store.
    Expected response:
        {
            "orderId": "order_1618033988",
            "status": "pending" | "success" | "failed"
        }
    """
    order_data = orders.get(orderId)
    if order_data:
        return jsonify({
            "orderId": orderId,
            "status": order_data["status"]
        }), 200
    else:
        return jsonify({"error": "Order not found"}), 404

# Main - Run the Flask Application
###############################################################################
if __name__ == "__main__":
    # Run the Flask app on host 0.0.0.0 and port 5003.
    app.run(host="0.0.0.0", port=5003, debug=True)