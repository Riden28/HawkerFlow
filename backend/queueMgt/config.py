import os
import datetime
from dotenv import load_dotenv
from flask import Flask
from google.cloud import firestore
from google.oauth2 import service_account

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Get environment config
service_account_path = os.environ.get("FIREBASE_SERVICE_ACCOUNT_KEY_PATH")
project_id = os.environ.get("FIREBASE_PROJECT_ID")
if not service_account_path or not project_id:
    raise ValueError("Required environment variables are not set.")

# Initialize Firestore
cred = service_account.Credentials.from_service_account_file(service_account_path)
db = firestore.Client(project=project_id, credentials=cred, database='queue')

# Firestore reference to the hawker stall
hawker_center = "Maxwell Food Centre"
hawker_stall = "Maxwell Fuzhou Oyster Cake"
stall_ref = db.collection(hawker_center).document(hawker_stall)

# -----------------------
# Order 002
# -----------------------
order_002_data = {
    "Oyster Cake": {
        "completed": False,
        "quantity": 2,
        "time_started": datetime.datetime(2025, 3, 21, 16, 10, 0),
        "waitTime": 5
    },
    "Spring Roll": {
        "completed": False,
        "quantity": 1,
        "time_started": datetime.datetime(2025, 3, 21, 16, 10, 0),
        "waitTime": 3
    }
}

# -----------------------
# Order 003
# -----------------------
order_003_data = {
    "Fried Carrot Cake": {
        "completed": False,
        "quantity": 1,
        "time_started": datetime.datetime(2025, 3, 21, 16, 15, 30),
        "waitTime": 6
    }
}

# -----------------------
# Push to Firestore
# -----------------------
stall_ref.collection("order").document("order_002").set(order_002_data)
stall_ref.collection("order").document("order_003").set(order_003_data)

print("✅ Successfully populated order_002 and order_003.")