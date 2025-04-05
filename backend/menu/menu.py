import os
from dotenv import load_dotenv
from flask import Flask, jsonify, request
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
# db = firestore.Client(project=project_id, credentials=cred, database='menu')
db = firestore.Client(project=project_id, credentials=cred)


@app.route("/menu/<hawkername>", methods=["GET"])
def get_stalls_in_hawkercenter(hawkername):
    # 1) Reference the "menu" collection
    hawker_doc_ref = db.collection("menu").document(hawkername)
    hawker_doc = hawker_doc_ref.get()
    if not hawker_doc.exists:
        return jsonify({"error": f"Hawker center '{hawkername}' not found."}), 404
    
    # 2) The stalls might be sub-documents, e.g. subcollection named "Stalls"
    # or, if the doc stores stall data directly, you'd do something different.
    stalls_ref = hawker_doc_ref.collection("Stalls")  
    docs = stalls_ref.stream()
    
    stalls = []
    for doc in docs:
        stall_data = doc.to_dict()
        stall_data["stallName"] = doc.id
        stalls.append(stall_data)

    if not stalls:
        return jsonify({"error": "No stalls available."}), 404
    return jsonify(stalls), 200


@app.route("/menu/<hawkername>/<stallname>", methods=["GET"])
def get_dishes_in_stall(hawkername, stallname):
    """
    Returns all dishes for the specified hawker stall.
    Each dish document in the 'Dishes' subcollection includes:
      - description: string (e.g., "Traditional crispy cake filled with oysters...")
      - dishPhoto: string (storage link)
      - inStock: boolean (e.g., true)
      - price: number (e.g., 5)
      - waitTime: number (in minutes, e.g., 12)
    Example: /menu/Maxwell%20Food%20Center/Zhen%20Zhen%20Porridge
    """
    # Verify the hawker stall document exists
    stall_doc_ref = db.collection(hawkername).document(stallname)
    stall_doc = stall_doc_ref.get()
    if not stall_doc.exists:
        return jsonify({"error": "Hawker stall not found."}), 404

    # Reference the "Dishes" subcollection within the stall document
    dishes_ref = stall_doc_ref.collection("Dishes")
    docs = dishes_ref.stream()

    dishes = []
    for doc in docs:
        dish_data = doc.to_dict()
        # Include the dish name (document ID)
        dish_data["dishName"] = doc.id
        dishes.append(dish_data)
    
    if not dishes:
        return jsonify({"error": "No dishes found for this stall."}), 404
    
    return jsonify(dishes), 200


# @app.route("/menu/waitTime", methods=["PUT"])
# def update_wait_times():
#     """
#     Updates waitTime for multiple hawker dishes.
#     Expects a JSON payload like:
#     [
#       { 
#           "stallName": "Tian Tian Hainanese Chicken Rice", 
#           "dishName": "Dish1", 
#           "waitTime": 10
#       },
#       { 
#           "stallName": "Another Stall", 
#           "dishName": "Dish2", 
#           "waitTime": 12
#       }
#     ]
#     """
#     payload = request.get_json()
#     if not payload or not isinstance(payload, list):
#         return jsonify({"error": "Payload must be a list of update objects"}), 400

#     batch = db.batch()
#     for update in payload:
#         stall_name = update.get("stallName")
#         dish_name = update.get("dishName")
#         wait_time = update.get("waitTime")

#         if stall_name is None or dish_name is None or wait_time is None:
#             return jsonify({"error": "Each update must include stallName, dishName, and waitTime"}), 400

#         # Assuming the hawker center is known; adjust collection name as needed
#         dish_ref = db.collection("Maxwell Food Centre").document(stall_name).collection("Dishes").document(dish_name)
#         batch.update(dish_ref, {"waitTime": wait_time})

#     try:
#         batch.commit()
#     except Exception as e:
#         return jsonify({"error": str(e)}), 500

#     return jsonify({"message": "Wait times updated successfully"}), 200

@app.route("/menu/waitTime", methods=["PATCH"])
def update_wait_times():
    """
    Updates waitTime for multiple hawker dishes.
    Expects a JSON payload like:
    [
      { 
          "stallName": "Tian Tian Hainanese Chicken Rice", 
          "dishName": "Dish1", 
          "waitTime": 10
      },
      ...
    ]
    """
    payload = request.get_json()
    if not payload or not isinstance(payload, list):
        return jsonify({"error": "Payload must be a list of update objects"}), 400

    hawker_centre = "Maxwell Food Centre"  # Optional: make dynamic later
    batch = db.batch()
    errors = []

    for idx, update in enumerate(payload):
        stall_name = update.get("stallName")
        dish_name = update.get("dishName")
        wait_time = update.get("waitTime")

        if not all([stall_name, dish_name, wait_time is not None]):
            errors.append({"index": idx, "error": "Missing stallName, dishName or waitTime"})
            continue

        try:
            dish_ref = db.collection(hawker_centre).document(stall_name).collection("Dishes").document(dish_name)
            batch.set(dish_ref, {"waitTime": wait_time}, merge=True)  # Use `set(..., merge=True)` to prevent errors if dish doesn't exist
        except Exception as e:
            errors.append({"index": idx, "error": str(e)})

    if errors:
        return jsonify({"message": "Partial success", "errors": errors}), 207

    try:
        batch.commit()
        return jsonify({"message": "Wait times updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Run the Flask app on host 0.0.0.0 and port 5000
    app.run(host='0.0.0.0', port=5001, debug=True)