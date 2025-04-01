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
# (Queue and Notification services are now notified via RabbitMQ)
# You can still set these for other purposes if needed:

# RabbitMQ configuration (for asynchronous messaging)
RABBITMQ_HOST = os.environ.get("RABBITMQ_HOST", "localhost")
EXCHANGE_NAME = 'order_exchange'
# QUEUE_NAME is not used for publishing in this composite service.
# In our case, we are only publishing messages to the exchange with specific routing keys.

# Initialize RabbitMQ connection and channel
connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_HOST))
channel = connection.channel()

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
            properties=pika.BasicProperties(delivery_mode=2)
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
# 2) POST /order - Accept Orders, Call Payment, and Publish Notifications
###############################################################################
@app.route("/order", methods=["POST"])
def create_order():
    """
    POST /order
    Accepts an order from the UI. Expected JSON payload:
      {
          "userId": 123,
          "email": "jane.doe@example.com",
          "stalls": {
              "Tian Tian Hainanese Chicken Rice": { "dishes": [0, 2] },
              "Maxwell Fuzhou Oyster Cake": { "dishes": [0] }
          }
      }
    Steps:
      1. Parse order request and generate a unique orderId.
      2. For each stall, call the MENU microservice (GET /menu/<hawkerCenter>/<stallName>)
         to retrieve dish data and compute total price (assume quantity = 1 per dish).
      3. Build a paymentRequest payload and call the PAYMENT microservice (POST /processPayment).
      4. Update the order status based on the Payment response.
      5. If payment is successful, asynchronously publish notifications:
         - To Queue Management (routing key: "<orderId>.queue")
         - To Notification service (routing key: "<orderId>.notif")
      6. Return orderStatus to the UI.
    """
    try:
        order_request = request.get_json()
        if not order_request:
            return jsonify({"error": "Invalid JSON payload"}), 400

        user_id = order_request.get("userId")
        email = order_request.get("email")
        stalls_dict = order_request.get("stalls")  # e.g., { "StallName": { "dishes": [0, 2] } }
        if user_id is None or email is None or stalls_dict is None:
            return jsonify({"error": "Missing required fields"}), 400

        # Generate a unique order ID using the current timestamp.
        order_id = f"order_{int(time.time())}"
        orders[order_id] = {
            "userId": user_id,
            "email": email,
            "stalls": stalls_dict,
            "status": "pending"
        }

        # For this demo, we hardcode hawkerCenter.
        hawkerCenter = "Maxwell Food Centre"

        #######################################################################
        # Compute Payment Amount by calling the MENU microservice for each stall.
        #######################################################################
        total_payment_amount = 0.0
        for stallName, stallData in stalls_dict.items():
            # Outbound API Call: GET /menu/<hawkerCenter>/<stallName> on MENU microservice.
            menu_url = f"{MENU_SERVICE_URL}/menu/{hawkerCenter}/{stallName}"
            try:
                menu_response = requests.get(menu_url, timeout=5)
                if menu_response.status_code != 200:
                    print(f"Failed to retrieve menu for stall: {stallName}")
                    continue

                menu_items = menu_response.json()  # List of dish objects
                dish_indices = stallData.get("dishes", [])
                # Sum up the price for each dish indicated by its index.
                for dish_idx in dish_indices:
                    if dish_idx < 0 or dish_idx >= len(menu_items):
                        continue  # Skip invalid indices.
                    dish_info = menu_items[dish_idx]
                    dish_price = dish_info.get("price", 0.0)
                    total_payment_amount += dish_price

            except Exception as e:
                print(f"Error calling MENU microservice for stall {stallName}: {e}")
                continue

        print(f"Total payment for order {order_id} is {total_payment_amount}")

        #######################################################################
        # Call PAYMENT Microservice to Process Payment
        #######################################################################
        payment_payload = {
            "paymentAmount": total_payment_amount,
            "orderId": order_id,
            "userId": user_id
        }
        payment_status = "failed"  # Default status
        try:
            # Outbound API Call: POST /processPayment on PAYMENT microservice.
            payment_url = f"{PAYMENT_SERVICE_URL}/processPayment"
            payment_resp = requests.post(payment_url, json=payment_payload, timeout=5)
            if payment_resp.status_code == 200:
                payment_result = payment_resp.json()
                payment_status = payment_result.get("paymentStatus", "failed")
        except Exception as e:
            print(f"Error calling PAYMENT microservice: {e}")

        # Update the order's status in our in-memory store.
        orders[order_id]["status"] = payment_status

        #######################################################################
        # Publish Notifications via RabbitMQ (Asynchronous Messaging)
        #######################################################################
        if payment_status == "success":
            # Build the order details notification payload.
            order_details = {
                "hawkerCentre": hawkerCenter,
                "orderId": order_id,
                "email": email,
                "userId": user_id,
                "paymentStatus": "paid",
                "stalls": stalls_dict  # In a full implementation, this might include detailed dish info.
            }
            # Publish to Queue Management service using routing key "<orderId>.queue"
            publish_message(f"{order_id}.queue", order_details)
            
            # Build notification payload for the Notification service.
            notif_data = {
                "orderId": order_id,
                "userId": user_id,
                "email": email,
                "orderStatus": "completed"
                # "phoneNumber": ... (if available)
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

#Used by Sean to test rabbbitmq 
# orderDetails = {
#     "hawkerCentre": "Maxwell Food Centre",
#     "orderId": "order_010",
#     "phoneNumber": "+6585220855",
#     "userId": "user_008",
#     "paymentStatus": "paid",
#     "stalls": {
#         "Maxwell Fuzhou Oyster Cake": {
#         "dishes": [
#             {
#             "name": "Fried Carrot Cake",
#             "quantity": 1,
#             "waitTime": 6
#             }
#         ]
#         },
#         "Tian Tian Hainanese Chicken Rice": {
#         "dishes": [
#             {
#             "name": "Chicken Rice",
#             "quantity": 2,
#             "waitTime": 10
#             },
#             {
#             "name": "Iced Tea",
#             "quantity": 1,
#             "waitTime": 2
#             }
#         ]
#         }
#     }
# }
# test_order_id = "test_001"

# publish_message(f"{test_order_id}.queue", orderDetails)

###############################################################################
# Main - Run the Flask Application
###############################################################################
if __name__ == "__main__":
    # Run the Flask app on host 0.0.0.0 and port 5555.
    app.run(host="0.0.0.0", port=5555, debug=True)
