import os
import time
import requests
from flask import Flask, request, jsonify

###############################################################################
# Flask App Initialization
###############################################################################
app = Flask(__name__)

###############################################################################
# Environment-Based Configuration
# (Update these or set them via environment variables)
###############################################################################
MENU_SERVICE_URL = os.environ.get("MENU_SERVICE_URL", "http://localhost:5001")
PAYMENT_SERVICE_URL = os.environ.get("PAYMENT_SERVICE_URL", "http://localhost:5002")
QUEUE_SERVICE_URL = os.environ.get("QUEUE_SERVICE_URL", "http://localhost:5003")
NOTIF_SERVICE_URL = os.environ.get("NOTIF_SERVICE_URL", "http://localhost:5004")

# In-memory storage of orders for demonstration.
# In a production system, you might use a database instead.
orders = {}

###############################################################################
# 1) Composite Endpoints to Retrieve Stall Lists and Menu Items
###############################################################################
@app.route("/menu/<string:hawkerCenter>", methods=["GET"])
def get_stalls_for_hawker_center(hawkerCenter):
    """
    GET /menu/<hawkerCenter>
    - Proxies the request to the MENU microservice to fetch a list of stalls in a hawker center.
    - The MENU microservice returns a JSON array of stalls, each containing:
        {
            "category": "Chinese",
            "description": "...",
            "rating": 5,
            "stallName": "Maxwell Fuzhou Oyster Cake",
            "stallPhoto": "storage link"
        }
    """
    try:
        # Construct the Menu microservice endpoint
        url = f"{MENU_SERVICE_URL}/menu/{hawkerCenter}"
        response = requests.get(url, timeout=5)
        
        if response.status_code == 200:
            return jsonify(response.json()), 200
        else:
            return jsonify({
                "error": f"Failed to retrieve stall list from Menu service. Status code: {response.status_code}"
            }), response.status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/menu/<string:hawkerCenter>/<string:hawkerStall>", methods=["GET"])
def get_menu_for_stall(hawkerCenter, hawkerStall):
    """
    GET /menu/<hawkerCenter>/<hawkerStall>
    - Proxies the request to the MENU microservice to fetch all menu items for a given stall.
    - The MENU microservice returns a JSON array of dish objects:
        {
            "dishName": "Chicken Rice (Regular)",
            "description": "...",
            "dishPhoto": "storage link",
            "inStock": true,
            "price": 5.5,
            "waitTime": 8
        }
    """
    try:
        # Construct the Menu microservice endpoint
        url = f"{MENU_SERVICE_URL}/menu/{hawkerCenter}/{hawkerStall}"
        response = requests.get(url, timeout=5)
        
        if response.status_code == 200:
            return jsonify(response.json()), 200
        else:
            return jsonify({
                "error": f"Failed to retrieve stall menu items. Status code: {response.status_code}"
            }), response.status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 500

###############################################################################
# 2) POST /order - Accept Orders & Call Payment
###############################################################################
@app.route("/order", methods=["POST"])
def create_order():
    """
    POST /order
    - Accepts an orderRequest from the Customer UI in the form:
        {
            "userId": 123,
            "email": "jane.doe@example.com",
            "stalls": {
                "Tian Tian Hainanese Chicken Rice": {
                    "dishes": [0, 2]
                },
                "Maxwell Fuzhou Oyster Cake": {
                    "dishes": [0]
                }
            }
        }
        Where each stall maps to an array of dish indices (e.g., 0, 2) that refer to the
        positions of dishes in the menu array returned by the Menu microservice.

    - Steps:
        1. Parse the incoming JSON to extract user ID, email, and stalls.
        2. For each stall, call GET /menu/<hawkerCenter>/<stallName> to retrieve dish data,
            and sum up the price * quantity (for now, assume quantity=1 for each index).
        3. Call the Payment microservice (POST /processPayment) with the computed total.
        4. Update the order status in an in-memory store (pending, success, failed).
        5. Return the order status to the Customer UI.

    - Data Structures:
        paymentRequest = {
            "paymentAmount": float,
            "orderId": int,
            "userId": int
        }

        paymentResult = {
            "paymentStatus": "success" or "failed"
        }
    """
    try:
        order_request = request.get_json()
        if not order_request:
            return jsonify({"error": "Invalid JSON payload"}), 400

        user_id = order_request.get("userId")
        email = order_request.get("email")
        stalls_dict = order_request.get("stalls")  # e.g. { "StallName": { "dishes": [0, 2] } }

        if user_id is None or email is None or stalls_dict is None:
            return jsonify({"error": "Missing required fields"}), 400

        # Generate a unique order ID
        order_id = f"order_{int(time.time())}"
        
        # Initially set order status to "pending"
        orders[order_id] = {
            "userId": user_id,
            "email": email,
            "stalls": stalls_dict,
            "status": "pending"
        }

        # Hardcode hawkerCenter for now or retrieve from the request if needed
        # e.g. hawkerCenter = order_request.get("hawkerCenter", "Maxwell Food Centre")
        hawkerCenter = "Maxwell Food Centre"

        #######################################################################
        # Compute Payment Amount by calling the MENU microservice for each stall
        #######################################################################
        total_payment_amount = 0.0
        some_token = "somedongdong"

        for stallName, stallData in stalls_dict.items():
            # For each stall, retrieve the dish array from the Menu microservice
            menu_url = f"{MENU_SERVICE_URL}/menu/{hawkerCenter}/{stallName}"
            try:
                menu_response = requests.get(menu_url, timeout=5)
                if menu_response.status_code != 200:
                    # If we cannot get the menu from the service, skip or handle error
                    print(f"Failed to retrieve menu for stall: {stallName}")
                    continue
                
                menu_items = menu_response.json()  # This should be a list of dish objects
                dish_indices = stallData.get("dishes", [])

                # For each index in dish_indices, accumulate the price
                for dish_idx in dish_indices:
                    # Ensure dish_idx is within bounds
                    if dish_idx < 0 or dish_idx >= len(menu_items):
                        continue
                    dish_info = menu_items[dish_idx]
                    dish_price = dish_info.get("price", 0.0)
                    # (For simplicity, assume quantity = 1. If you have quantity, incorporate it.)
                    total_payment_amount += dish_price

            except Exception as e:
                print(f"Error calling Menu microservice for stall {stallName}: {e}")
                # Optionally handle partial failures or continue

        print(f"Total payment for order {order_id} is {total_payment_amount}")

        #######################################################################
        # Call Payment microservice
        #######################################################################
        payment_payload = {
            "paymentAmount": total_payment_amount,
            "token": some_token
        }

        payment_status = "failed"  # Default to failed unless Payment says success
        try:
            payment_url = f"{PAYMENT_SERVICE_URL}/processPayment"
            payment_resp = requests.post(payment_url, json=payment_payload, timeout=5)
            if payment_resp.status_code == 200:
                payment_result = payment_resp.json()
                payment_status = payment_result.get("paymentStatus", "failed")
        except Exception as e:
            print(f"Error calling Payment microservice: {e}")

        # Update the order's status
        orders[order_id]["status"] = payment_status

        #######################################################################
        # (Optional) Notify Queue Management and NOTIF
        #######################################################################
        # If payment_status == "success":
        #     order_details = {
        #         "hawkerCentre": hawkerCenter,
        #         "orderId": order_id,
        #         "email": email,
        #         "userId": user_id,
        #         "paymentStatus": "paid",
        #         "stalls": {
        #             # For demonstration, you could transform stalls_dict to match
        #             # the required structure (with dish name, quantity, waitTime, etc.)
        #         }
        #     }
        #     # e.g. requests.post(f"{QUEUE_SERVICE_URL}/addToQueue", json=order_details)
        #     # e.g. requests.post(f"{NOTIF_SERVICE_URL}/notify", json={
        #     #     "emailID": email,
        #     #     "orderId": order_id,
        #     #     "paymentStatus": payment_status
        #     # })

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
    Returns the current status of the given order:
    {
        "orderId": "...",
        "status": "pending" | "confirmed" | "failed"
    }
    If the order is not found, returns a 404.
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
# Main
###############################################################################
if __name__ == "__main__":
    # Run the Flask app on port 5000 by default
    app.run(host="0.0.0.0", port=5555, debug=True)
