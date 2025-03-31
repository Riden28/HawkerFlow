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
###############################################################################
# These environment variables define the base URLs for the microservices that
# Order Management will call. In a real deployment these might point to different
# hostnames or container names.
MENU_SERVICE_URL = os.environ.get("MENU_SERVICE_URL", "http://localhost:5001")
PAYMENT_SERVICE_URL = os.environ.get("PAYMENT_SERVICE_URL", "http://localhost:5002")
QUEUE_SERVICE_URL = os.environ.get("QUEUE_SERVICE_URL", "http://localhost:5003")
NOTIF_SERVICE_URL = os.environ.get("NOTIF_SERVICE_URL", "http://localhost:5004")

# In-memory storage of orders for demonstration purposes.
orders = {}

###############################################################################
# 1) Composite Endpoints for Menu Data (Proxy Calls to MENU Microservice)
###############################################################################
@app.route("/menu/<string:hawkerCenter>", methods=["GET"])
def get_stalls_for_hawker_center(hawkerCenter):
    """
    [Exposed to UI]
    GET /menu/<hawkerCenter>
    
    This endpoint proxies a request to the MENU microservice to retrieve the list of
    stalls available at the specified hawker center. The MENU microservice is expected
    to return a JSON array of stall objects with fields like:
        - category
        - description
        - rating
        - stallName
        - stallPhoto
    """
    try:
        # Outbound API Call: GET /menu/<hawkerCenter> on MENU microservice.
        url = f"{MENU_SERVICE_URL}/menu/{hawkerCenter}"
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            return jsonify(response.json()), 200
        else:
            return jsonify({
                "error": f"Failed to retrieve stall list from MENU service. Status code: {response.status_code}"
            }), response.status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/menu/<string:hawkerCenter>/<string:hawkerStall>", methods=["GET"])
def get_menu_for_stall(hawkerCenter, hawkerStall):
    """
    [Exposed to UI]
    GET /menu/<hawkerCenter>/<hawkerStall>
    
    This endpoint proxies a request to the MENU microservice to retrieve the menu items
    (dishes) for a specific stall. The MENU microservice is expected to return a JSON array
    of dish objects with fields such as:
        - dishName
        - description
        - dishPhoto
        - inStock
        - price
        - waitTime
    """
    try:
        # Outbound API Call: GET /menu/<hawkerCenter>/<hawkerStall> on MENU microservice.
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
# 2) POST /order - Accept Order from UI and Invoke Payment Microservice
###############################################################################
@app.route("/order", methods=["POST"])
def create_order():
    """
    [Exposed to UI]
    POST /order
    
    This composite endpoint accepts an orderRequest from the Customer UI.
    Expected orderRequest JSON:
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
    Explanation:
      1. The service extracts user details and the stalls/dish indices.
      2. For each stall, it calls the MENU microservice endpoint
         GET /menu/<hawkerCenter>/<stallName> to retrieve the list of dishes.
         (Here we assume hawkerCenter is "Maxwell Food Centre" for simplicity.)
      3. It then uses the provided dish indices to determine the price of each dish.
         (For this demo, we assume a quantity of 1 per dish.)
      4. The total payment amount is computed by summing up the prices.
      5. An outbound API call is made to the PAYMENT microservice:
         POST /processPayment with payload:
            {
                "paymentAmount": <computed total>,
                "orderId": "<generated order id>",
                "userId": 123
            }
         The Payment microservice is expected to return a JSON with:
            { "paymentStatus": "success" } or { "paymentStatus": "failed" }
      6. The order status is stored in-memory and returned to the UI.
    
    Testing with Postman:
      - Set method to POST.
      - URL: http://localhost:5555/order
      - Body (raw JSON):
          {
              "userId": 123,
              "email": "jane.doe@example.com",
              "stalls": {
                  "Tian Tian Hainanese Chicken Rice": { "dishes": [0, 2] },
                  "Maxwell Fuzhou Oyster Cake": { "dishes": [0] }
              }
          }
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

        # Generate a unique order ID based on current timestamp
        order_id = f"order_{int(time.time())}"
        orders[order_id] = {
            "userId": user_id,
            "email": email,
            "stalls": stalls_dict,
            "status": "pending"
        }

        # For demonstration, we hardcode the hawkerCenter.
        hawkerCenter = "Maxwell Food Centre"

        # -----------------------------------------------------------------------------
        # Compute Payment Amount
        # -----------------------------------------------------------------------------
        total_payment_amount = 0.0
        token = "somedongdongfromfrontend"

        # For each stall in the order, call the MENU microservice to retrieve dish details.
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

                # For each dish index provided, accumulate the price.
                for dish_idx in dish_indices:
                    if dish_idx < 0 or dish_idx >= len(menu_items):
                        continue  # Skip if index out of bounds
                    dish_info = menu_items[dish_idx]
                    dish_price = dish_info.get("price", 0.0)
                    total_payment_amount += dish_price

            except Exception as e:
                print(f"Error calling MENU microservice for stall {stallName}: {e}")
                continue

        print(f"Total payment for order {order_id} is {total_payment_amount}")

        # -----------------------------------------------------------------------------
        # Call PAYMENT Microservice
        # -----------------------------------------------------------------------------
        # Build the paymentRequest payload.
        payment_payload = {
            "paymentAmount": total_payment_amount,
            "token": token
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

        # Update the order status in our in-memory store.
        orders[order_id]["status"] = payment_status

        # -----------------------------------------------------------------------------
        # (Optional) Notify QUEUE MANAGEMENT and NOTIF Microservices
        # -----------------------------------------------------------------------------
        # For a full implementation, you might send a notification message with details like:
        # order_details = {
        #     "hawkerCentre": hawkerCenter,
        #     "orderId": order_id,
        #     "email": email,
        #     "userId": user_id,
        #     "paymentStatus": "paid" if payment_status == "success" else "failed",
        #     "stalls": { ... }  # Detailed dish info can be added here
        # }
        # Then call:
        # requests.post(f"{QUEUE_SERVICE_URL}/addToQueue", json=order_details)
        # requests.post(f"{NOTIF_SERVICE_URL}/notify", json={
        #     "emailID": email,
        #     "orderId": order_id,
        #     "paymentStatus": payment_status
        # })

        # -----------------------------------------------------------------------------
        # Return Response to UI
        # -----------------------------------------------------------------------------
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
    [Exposed to UI]
    GET /order/status/<orderId>
    
    Returns the current status of the specified order from our in-memory store.
    Expected response:
        {
            "orderId": "order_1618033988",
            "status": "pending"  // or "success" or "failed"
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
# Main - Run the Service
###############################################################################
if __name__ == "__main__":
    # Run the Flask app on host 0.0.0.0 on port 5555.
    app.run(host="0.0.0.0", port=5555, debug=True)
