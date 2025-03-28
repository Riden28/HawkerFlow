import os
from dotenv import load_dotenv
from flask import Flask, jsonify, abort
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

def initialize_queue_management_collection():
    collection_ref = db.collection("test")
    docs = list(collection_ref.limit(1).stream())
    if docs:
        print("✅ Collection already exists.")
    else:
        collection_ref.document("initDoc").set({
            "status": "initialized",
            "createdAt": firestore.SERVER_TIMESTAMP
        })
        print("✅ queueManagement collection initialized.")

if __name__ == "__main__":
    initialize_queue_management_collection()
