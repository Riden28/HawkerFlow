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
db = firestore.Client(project=project_id, credentials=cred, database='menu')

@app.route("/menu/<hawkername>", methods=["GET"])
def get_stalls_in_hawkercenter(hawkername):
    """
    Returns all hawker stalls in the specified hawker center.
    Each stall document includes the fields:
      - category: string (e.g., "Chinese")
      - description: string (e.g., "Specializing in traditional Fuzhou-style oyster cakes...")
      - rating: number (e.g., 5)
      - stallPhoto: string (storage link)
    Example: /menu/Maxwell%20Food%20Center
    """
    # Query the collection named after the hawker center
    stalls_ref = db.collection(hawkername)
    docs = stalls_ref.stream()

    stalls = []
    for doc in docs:
        stall_data = doc.to_dict()
        # Include the stall name (document ID)
        stall_data["stallName"] = doc.id
        stalls.append(stall_data)
    
    if not stalls:
        return jsonify({"error": "Hawker center not found or no stalls available."}), 404
    
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


@app.route("/menu/waitTime", methods=["PUT"])
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
      { 
          "stallName": "Another Stall", 
          "dishName": "Dish2", 
          "waitTime": 12
      }
    ]
    """
    payload = request.get_json()
    if not payload or not isinstance(payload, list):
        return jsonify({"error": "Payload must be a list of update objects"}), 400

    batch = db.batch()
    for update in payload:
        stall_name = update.get("stallName")
        dish_name = update.get("dishName")
        wait_time = update.get("waitTime")

        if stall_name is None or dish_name is None or wait_time is None:
            return jsonify({"error": "Each update must include stallName, dishName, and waitTime"}), 400

        # Assuming the hawker center is known; adjust collection name as needed
        dish_ref = db.collection("Maxwell Food Centre").document(stall_name).collection("Dishes").document(dish_name)
        batch.update(dish_ref, {"waitTime": wait_time})

    try:
        batch.commit()
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    return jsonify({"message": "Wait times updated successfully"}), 200


if __name__ == '__main__':
    # Run the Flask app on host 0.0.0.0 and port 5000
    app.run(host='0.0.0.0', port=5001, debug=True)