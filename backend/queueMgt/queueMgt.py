import os
from dotenv import load_dotenv
from flask import Flask, jsonify, abort, request
from google.cloud import firestore
from google.oauth2 import service_account

# Load environment variables (if using a .env file)
load_dotenv()

app = Flask(__name__)

# Retrieve environment variables for credentials and project
service_account_path = os.environ.get("FIREBASE_SERVICE_ACCOUNT_KEY_PATH")
project_id = os.environ.get("FIREBASE_PROJECT_ID")
if not service_account_path or not project_id:
    raise ValueError("Required environment variables are not set.")

# Create credentials from your service account JSON
cred = service_account.Credentials.from_service_account_file(service_account_path)
# Initialize the Firestore client
db = firestore.Client(project=project_id, credentials=cred, database='queue')


#GET - Scenario 2: Custoemr UI pulls current wait time
@app.route('/<hawkerCenter>/<hawkerStall>/waitTime', methods=['GET'])
def get_estimated_wait_time(hawkerCenter, hawkerStall):
    try:
        # Reference to the hawker stall document
        doc_ref = db.collection(hawkerCenter).document(hawkerStall)
        doc = doc_ref.get()

        if not doc.exists:
            abort(404, description="Hawker stall not found.")

        data = doc.to_dict()
        estimated_wait_time = data.get('estimatedWaitTime')

        if estimated_wait_time is None:
            abort(404, description="Estimated wait time not set for this stall.")

        return jsonify({
            "hawkerCenter": hawkerCenter,
            "hawkerStall": hawkerStall,
            "waitTime": estimated_wait_time
        })

    except Exception as e:
        print(f"Error fetching wait time: {e}")
        abort(500, description="Internal server error.")

#GET - Scenario 2: Hawker UI pulls complete order list
@app.route('/<hawkerCenter>/<hawkerStall>/orders', methods=['GET'])
def get_all_orders(hawkerCenter, hawkerStall):
    try:
        doc_ref = db.collection(hawkerCenter).document(hawkerStall)
        doc = doc_ref.get()

        if not doc.exists:
            abort(404, description="Hawker stall not found.")

        orders_ref = doc_ref.collection("order")
        orders = orders_ref.stream()
        
        result = {}

        for order in orders:
            result[order.id] = order.to_dict()

        return jsonify(result)
    
    except Exception as e:
        print(f"Error fetching orders: {e}")
        abort(500, description="Internal server error.")

#PATCH - Scenario 2: Mark Order as Completed
@app.route('/<hawkerCenter>/<hawkerStall>/orders/<orderId>/<dishName>/complete', methods=['PATCH'])
def complete_dish(hawkerCenter, hawkerStall, orderId, dishName):
    try:
        # Set completed status directly
        completed = True

        order_ref = db.collection(hawkerCenter).document(hawkerStall).collection("order").document(orderId)

        if not order_ref.get().exists:
            return {"error": "Order not found"}, 404

        # Update dish's completed field
        field_path = f"{dishName}.completed"
        order_ref.update({field_path: completed})

        return jsonify({
            "message": f"'{dishName}' marked as completed",
            "orderId": orderId,
            "dish": dishName,
            "completed": completed
        }), 200

    except Exception as e:
        print(f"Error completing dish: {e}")
        return {"error": "Internal server error"}, 500

#PATCH - Scenario 2: Mark Order as Completed
#Need to pass a Json {completed: true}, this means can revert to false as well
# @app.route('/<hawkerCenter>/<hawkerStall>/orders/<orderId>/<dishName>/complete', methods=['PATCH'])
# def complete_dish(hawkerCenter, hawkerStall, orderId, dishName):
#     try:
#         data = request.get_json(silent=True) or {}
#         completed = data.get("completed", True)  # Defaults to True

#         order_ref = db.collection(hawkerCenter).document(hawkerStall).collection("order").document(orderId)

#         # Check if the order exists
#         if not order_ref.get().exists:
#             return {"error": "Order not found"}, 404

#         # Update the dish's 'completed' status
#         field_path = f"{dishName}.completed"
#         order_ref.update({field_path: completed})

#         return jsonify({
#             "message": f"'{dishName}' marked as {'completed' if completed else 'not completed'}",
#             "orderId": orderId,
#             "dish": dishName,
#             "completed": completed
#         }), 200

#     except Exception as e:
#         print(f"Error completing dish: {e}")
#         return {"error": "Internal server error"}, 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)