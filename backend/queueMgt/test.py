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

# # Simulated RabbitMQ message structure
orderDetails = {
    "hawkerCentre": "Maxwell Food Centre",
    "orderId": "order_011",
    "email": "jane.doe@example.com",
    "userId": "user_002",
    "stalls": {
        "Maxwell Fuzhou Oyster Cake": {
            "dishes": [
                {
                    "dishName": "Fried Carrot Cake",
                    "quantity": 1,
                    "waitTime": 6
                }
            ]
        },
        "Tian Tian Hainanese Chicken Rice": {
            "dishes": [
                {
                    "dishName": "Chicken Rice",
                    "quantity": 1,
                    "waitTime": 8
                },
                {
                    "dishName": "Iced Tea",
                    "quantity": 2,
                    "waitTime": 5
                }
            ]
        }
    },
    "paymentStatus": "paid"
}

# Loop through each stall
for stall_name, data in orderDetails["stalls"].items():
    # Reference to the stall document
    stall_ref = db.collection(orderDetails["hawkerCentre"]).document(stall_name)

    # Ensure estimatedWaitTime is added if not present
    stall_doc = stall_ref.get()
    if not stall_doc.exists:
        stall_ref.set({"estimatedWaitTime": 0})  # Init if needed

    # Reference to the order subcollection
    order_ref = stall_ref.collection("order").document(orderDetails["orderId"])

    # Build the dish data
    dish_data = {}
    total_wait_time = 0
    order_data = {
        "userID": orderDetails["userId"],
        "email": orderDetails["email"]
    }

    for dish_info in data["dishes"]:
        dish_name = dish_info["dishName"]
        wait_time = dish_info["waitTime"]
        quantity = dish_info["quantity"]
        
        dish_data[dish_name] = {
            "completed": False,
            "quantity": quantity,
            "time_started": firestore.SERVER_TIMESTAMP,
            "waitTime": wait_time,
        }

        total_wait_time += wait_time * quantity
        order_data.update(dish_data) 

    # Add dish data under the order document

    order_ref.set(order_data)

    # Optionally increment estimatedWaitTime (basic example)
    stall_ref.update({
        "estimatedWaitTime": firestore.Increment(total_wait_time)
    })

print("Order stored successfully.")