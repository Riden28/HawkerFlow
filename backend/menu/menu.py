import os
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from google.cloud import firestore
from google.oauth2 import service_account

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Retrieve credentials and project ID
service_account_path = os.environ.get("FIREBASE_SERVICE_ACCOUNT_KEY_PATH")
project_id = os.environ.get("FIREBASE_PROJECT_ID")
if not service_account_path or not project_id:
    raise ValueError("Required environment variables are not set.")

cred = service_account.Credentials.from_service_account_file(service_account_path)
# Initialize Firestore client (remove the database parameter if not needed)
db = firestore.Client(project=project_id, credentials=cred, database='menu')

##############################################
# GET /hawkerCenters
##############################################
@app.route("/hawkerCenters", methods=["GET"])
def get_all_hawker_centers():
    centers_ref = db.collection("hawkerCenters")
    docs = centers_ref.stream()
    centers = []
    for doc in docs:
        data = doc.to_dict()
        data["hawkerId"] = doc.id  # Use this ID for navigation
        centers.append(data)
    if not centers:
        return jsonify({"error": "No hawker centers found."}), 404
    return jsonify(centers), 200

##############################################
# GET /hawkerCenters/<hawkerId>/stalls
##############################################
@app.route("/hawkerCenters/<hawkerId>/stalls", methods=["GET"])
def get_stalls_for_hawker_center(hawkerId):
    hawker_doc_ref = db.collection("hawkerCenters").document(hawkerId)
    hawker_doc = hawker_doc_ref.get()
    if not hawker_doc.exists:
        return jsonify({"error": f"Hawker center '{hawkerId}' not found."}), 404
    stalls_ref = hawker_doc_ref.collection("Stalls")
    docs = stalls_ref.stream()
    stalls = []
    for doc in docs:
        stall_data = doc.to_dict()
        stall_data["stallId"] = doc.id
        stalls.append(stall_data)
    if not stalls:
        return jsonify({"error": f"No stalls found for hawker center '{hawkerId}'."}), 404
    return jsonify(stalls), 200

##############################################
# GET /hawkerCenters/<hawkerId>/stalls/<stallId>/dishes
##############################################
@app.route("/hawkerCenters/<hawkerId>/stalls/<stallId>/dishes", methods=["GET"])
def get_dishes_in_stall(hawkerId, stallId):
    hawker_doc_ref = db.collection("hawkerCenters").document(hawkerId)
    if not hawker_doc_ref.get().exists:
        return jsonify({"error": f"Hawker center '{hawkerId}' not found."}), 404
    stall_doc_ref = hawker_doc_ref.collection("Stalls").document(stallId)
    if not stall_doc_ref.get().exists:
        return jsonify({"error": f"Stall '{stallId}' not found in hawker center '{hawkerId}'."}), 404
    dishes_ref = stall_doc_ref.collection("dishes")
    docs = dishes_ref.stream()
    dishes = []
    for doc in docs:
        dish_data = doc.to_dict()
        dish_data["dishId"] = doc.id
        dishes.append(dish_data)
    if not dishes:
        return jsonify({"error": f"No dishes found for stall '{stallId}'."}), 404
    return jsonify(dishes), 200

##############################################
# PATCH /menu/waitTime
##############################################
@app.route("/menu/waitTime", methods=["PATCH"])
def update_wait_times():
    payload = request.get_json()
    if not payload or not isinstance(payload, list):
        return jsonify({"error": "Payload must be a list of update objects"}), 400

    # Start a batch to perform all updates at once
    batch = db.batch()
    errors = []

    for idx, update in enumerate(payload):
        # Each entry must include these fields
        hawker_center = update.get("hawkerCenter")
        stall_name = update.get("stallName")
        dish_name = update.get("dishName")
        wait_time = update.get("waitTime")

        # Validate required fields
        if not all([hawker_center, stall_name, dish_name, (wait_time is not None)]):
            errors.append(
                {"index": idx, "error": "Missing hawkerCenter, stallName, dishName, or waitTime"}
            )
            continue

        try:
            # Build the reference based on the new DB layout:
            # hawkerCenters/<hawker_center>/Stalls/<stall_name>/dishes/<dish_name>
            dish_ref = (
                db.collection("hawkerCenters")
                    .document(hawker_center)
                    .collection("Stalls")
                    .document(stall_name)
                    .collection("dishes")
                    .document(dish_name)
            )

            # Update (merge) only the waitTime field in the dish document
            batch.set(dish_ref, {"waitTime": wait_time}, merge=True)

        except Exception as e:
            errors.append({"index": idx, "error": str(e)})

    # If any errors occurred during the loop, return partial success
    if errors:
        return jsonify({"message": "Partial success", "errors": errors}), 207

    # Otherwise, commit the batch
    try:
        batch.commit()
        return jsonify({"message": "Wait times updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5001, debug=True)
