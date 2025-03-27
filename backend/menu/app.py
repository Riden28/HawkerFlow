import os
from dotenv import load_dotenv
from flask import Flask, jsonify
from google.cloud import firestore
from google.oauth2 import service_account

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

service_account_path = os.environ.get("FIREBASE_SERVICE_ACCOUNT_KEY_PATH")
if not service_account_path:
    raise ValueError("FIREBASE_SERVICE_ACCOUNT_KEY_PATH not set")

# Load credentials using google.oauth2
cred = service_account.Credentials.from_service_account_file(service_account_path)

project_id = os.environ.get("FIREBASE_PROJECT_ID")
if not project_id:
    raise ValueError("FIREBASE_PROJECT_ID not set")

# Create a Firestore client for your named database (e.g., "menu")
menu_db = firestore.Client(project=project_id, credentials=cred, database='menu')
db = menu_db

@app.route('/menu', methods=['GET'])
def get_all_stalls():
    """
    Returns all the data in the 'menu' database.
    Each top-level collection (stall) and its documents (dishes) are included.
    """
    all_data = {}
    # Get all top-level collections (each representing a stall)
    stall_collections = db.collections()
    for coll in stall_collections:
        stall_id = coll.id
        dishes = []
        # Iterate through all dish documents in the stall collection
        for doc in coll.stream():
            dish_data = doc.to_dict()
            dish_data["dishId"] = doc.id  # Optionally include the document ID
            dishes.append(dish_data)
        all_data[stall_id] = dishes

    return jsonify(all_data), 200

@app.route('/menu/<stall_id>', methods=['GET'])
def get_stall_dishes(stall_id):
    # Retrieve all documents (dishes) in the specified stall collection
    stall_ref = db.collection(stall_id)
    docs = stall_ref.stream()
    dishes = []
    for doc in docs:
        dish_data = doc.to_dict()
        dish_data["dishId"] = doc.id
        dishes.append(dish_data)
    return jsonify({"stallId": stall_id, "dishes": dishes}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
