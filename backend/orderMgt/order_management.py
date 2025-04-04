import os
import time
import json
import requests
import pika
from flask import Flask, request, jsonify

###############################################################################
# Flask App Initialization
###############################################################################
app = Flask(__name__)

###############################################################################
# Environment-Based Configuration
###############################################################################
# Base URLs for outbound REST calls to other microservices.
MENU_SERVICE_URL = os.environ.get("MENU_SERVICE_URL", "http://localhost:5001")
PAYMENT_SERVICE_URL = os.environ.get("PAYMENT_SERVICE_URL", "http://localhost:5002")
# (Queue and Notification services will be notified via RabbitMQ.)
# RabbitMQ configuration for asynchronous messaging:
RABBITMQ_HOST = os.environ.get("RABBITMQ_HOST", "localhost")
EXCHANGE_NAME = 'order_exchange'  # Exchange name for publishing notifications

# Initialize RabbitMQ connection and channel.
try:
    connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_HOST))
    channel = connection.channel()
    channel.exchange_declare(exchange=EXCHANGE_NAME, exchange_type='topic', durable=True)
    print("RabbitMQ connection established and exchange declared.")
except Exception as e:
    print(f"Error setting up RabbitMQ: {e}")
    channel = None

###############################################################################
# In-memory storage for orders (for demonstration purposes)
###############################################################################
orders = {}

###############################################################################
# Utility function: Asynchronous Publisher via RabbitMQ
###############################################################################
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

###############################################################################
# 1) Composite Endpoints to Retrieve Stall Lists and Menu Items (Proxy Calls)
###############################################################################
@app.route("/menu/<string:hawkerCenter>", methods=["GET"])
def get_stalls_for_hawker_center(hawkerCenter):
    """
    GET /menu/<hawkerCenter>
    Proxies the request to the MENU microservice to retrieve the list of stalls.
    Outbound API Call: GET /menu/<hawkerCenter> on MENU service.
    """
    try:
        url = f"{MENU_SERVICE_URL}/menu/{hawkerCenter}"
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            return jsonify(response.json()), 200
        else:
            return jsonify({"error": f"Failed to retrieve stall list. Status code: {response.status_code}"}), response.status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/menu/<string:hawkerCenter>/<string:hawkerStall>", methods=["GET"])
def get_menu_for_stall(hawkerCenter, hawkerStall):
    """
    GET /menu/<hawkerCenter>/<hawkerStall>
    Proxies the request to the MENU microservice to retrieve the dish menu for a specific stall.
    Outbound API Call: GET /menu/<hawkerCenter>/<hawkerStall> on MENU service.
    """
    try:
        url = f"{MENU_SERVICE_URL}/menu/{hawkerCenter}/{hawkerStall}"
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            return jsonify(response.json()), 200
        else:
            return jsonify({"error": f"Failed to retrieve menu items. Status code: {response.status_code}"}), response.status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 500

###############################################################################
# 2) POST /order - Accept Orders, Forward Payment Payload, and Publish Notifications
###############################################################################
@app.route("/order", methods=["POST"])
def create_order():
    """
    POST /order
    This composite endpoint now expects an orderRequest from the front end that includes both
    order details and payment information. The expected JSON payload is:
    
    {
      "userId": 123,
      "email": "jane.doe@example.com",
      "stalls": {
          "Tian Tian Hainanese Chicken Rice": { "dishes": [0, 2] },
          "Maxwell Fuzhou Oyster Cake": { "dishes": [0] }
      },
      "payment": {
          "createdAt": "2025-04-02T14:51:38.831Z",
          "email": "amberlyfong.2023@scis.smu.edu.sg",
          "id": "ch_3R9SdhFKfP7LOez70mJaRIdm",
          "items": [
              {
                  "id": 101,
                  "name": "Chicken Rice",
                  "quantity": 1,
                  "price": 5.5,
                  "stallName": "Ah Hock Chicken Rice"
              }
          ],
          "paymentMethod": "card",
          "specialInstructions": "",
          "status": "ready_for_pickup",
          "token": { ... },
          "total": 5.45
      }
    }
    
    Steps:
      1. Parse the incoming orderRequest and generate a unique orderId.
      2. For each stall, optionally call the MENU microservice (GET /menu/<hawkerCenter>/<stallName>)
         to verify dish details (if needed). In this implementation, we assume the payment info
         already contains the total and details.
      3. Forward the provided payment payload to the PAYMENT microservice via a POST /processPayment.
         Outbound API Call: POST /processPayment on PAYMENT service with the full payment payload.
      4. Update the order status based on the Payment response.
      5. If payment is successful, asynchronously publish notifications via RabbitMQ:
         - To Queue Management service using routing key: "<orderId>.queue"
         - To Notification service using routing key: "<orderId>.notif"
      6. Return the orderStatus to the UI.
    """
    try:
        order_request = request.get_json()
        if not order_request:
            return jsonify({"error": "Invalid JSON payload"}), 400

        user_id = order_request.get("userId")
        email = order_request.get("email")
        stalls_dict = order_request.get("stalls")
        payment_payload = order_request.get("payment")  # Payment payload as per sample structure
        if user_id is None or email is None or stalls_dict is None or payment_payload is None:
            return jsonify({"error": "Missing required fields: userId, email, stalls, and payment are required."}), 400

        # Generate a unique order ID.
        order_id = f"order_{int(time.time())}"
        orders[order_id] = {
            "userId": user_id,
            "email": email,
            "stalls": stalls_dict,
            "status": "pending"
        }
        
        # Hardcode hawkerCenter for demo purposes.
        hawkerCenter = "Maxwell Food Centre"

        # (Optional) You may call the MENU microservice to verify dish details for each stall.
        # For this implementation, we assume the payment payload has already been validated by the front end.

        #######################################################################
        # Forward Payment Information to PAYMENT Microservice
        #######################################################################
        # Outbound API Call: POST /processPayment on PAYMENT service.
        # We forward the payment payload (which includes fields like createdAt, email, id, items, paymentMethod, token, total, etc.)
        try:
            payment_service_url = f"{PAYMENT_SERVICE_URL}/processPayment"
            payment_resp = requests.post(payment_service_url, json=payment_payload, timeout=5)
            if payment_resp.status_code == 200:
                payment_result = payment_resp.json()
                payment_status = payment_result.get("paymentStatus", "failed")
            else:
                payment_status = "failed"
                print(f"PAYMENT service responded with status code: {payment_resp.status_code}")
        except Exception as e:
            print(f"Error calling PAYMENT microservice: {e}")
            payment_status = "failed"

        # Update order status in our in-memory store.
        orders[order_id]["status"] = payment_status

        #######################################################################
        # Publish Notifications via RabbitMQ (Asynchronous Messaging)
        #######################################################################
        if payment_status == "success":
            # Build order notification payload for Queue Management.
            order_details = {
                "hawkerCentre": hawkerCenter,
                "orderId": order_id,
                "email": email,
                "userId": user_id,
                "paymentStatus": "paid",
                "stalls": stalls_dict  # In a full implementation, detailed dish info could be included.
            }
            # Publish to Queue Management using routing key "<orderId>.queue"
            publish_message(f"{order_id}.queue", order_details)
            
            # Build notification payload for Notification service.
            notif_data = {
                "orderId": order_id,
                "userId": user_id,
                "phoneNumber": email,  # Using email as a placeholder; replace with actual phone if available.
                "orderStatus": "completed"
            }
            # Publish to Notification service using routing key "<orderId>.notif"
            publish_message(f"{order_id}.notif", notif_data)

        #######################################################################
        # Return Response to the Customer UI
        #######################################################################
        return jsonify({
            "orderId": order_id,
            "status": payment_status
        }), 200

    except Exception as e:
        print(f"Error in create_order: {e}")
        return jsonify({"error": str(e)}), 500

###############################################################################
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

###############################################################################
# Main - Run the Flask Application
###############################################################################
if __name__ == "__main__":
    # Run the Flask app on host 0.0.0.0 and port 5555.
    app.run(host="0.0.0.0", port=5555, debug=True)
