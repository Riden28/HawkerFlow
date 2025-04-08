import os
import random
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

# 💡 Final structure: each hawker center is a collection, each stall is a document
hawker_data = {
    "Maxwell Food Center": [
        "Ah Heng Curry Chicken Bee Hoon Mee",
        "Danlao",
        "Fuzhou Oyster Cake",
        "Tian Tian Chicken Rice",
        "Zhong Guo La Mian Xiao Long Bao"
    ],
    "Old Airport Road Food Center": [
        "Jin Hua Fish Head Bee Hoon",
        "Old Nyonya",
        "Rojak, Popiah & Cockle",
        "Tong Fong Fatt Hainanese Boneless Chicken Rice",
        "Ye Lai Xiang Tasty Barbecue"
    ],
    "Lau Pa Sat": [
        "545 Whampoa Prawn Noodles",
        "AR Rahman Cafe & Royal Prata",
        "Allauddin's Briyani",
        "Lian He Ben Ji Claypot Rice",
        "Monan Pork Soup"
    ],
    "Chinatown Complex Food Center": [
        "Hakka HamCha & Yong Tou Fu",
        "Heng Ji Chicken Rice",
        "Hill Street Fried Kway Teow",
        "Hong Kong Mong Kok Tim Sum",
        "Zhu Zhu Zai"
    ]
}

# 🍜 Sample dishes
menu = ["Laksa", "Char Kway Teow", "Mee Rebus", "Chicken Rice", "Popiah", "Oyster Cake", "Claypot Rice"]

# 🧠 Seeding logic
for center_name, stalls in hawker_data.items():
    print(f"\n🏢 Seeding Hawker Center: {center_name}")

    for stall_name in stalls:
        print(f"  🍽️ Stall: {stall_name}")

        # Each hawker center is a collection; each stall is a document
        stall_ref = db.collection(center_name).document(stall_name)
        stall_ref.set({
            "estimatedWaitTime": 0,
            "totalEarned": 0
        })

        total_wait_time = 0

        for i in range(4):  # Generate 4 orders
            order_id = f"order_{i+1:03d}"
            order_ref = stall_ref.collection("orders").document(order_id)

            order_data = {
                "userId": f"user_{stall_name[:3]}_{order_id}",
                "phoneNumber": f"9123{random.randint(1000,9999)}"
            }

            selected_dishes = random.sample(menu, 2)
            for dish in selected_dishes:
                quantity = random.randint(1, 3)
                wait_time = random.randint(5, 10)
                price = random.randint(3, 7)
                total_wait_time += quantity * wait_time

                order_data[dish] = {
                    "completed": False,
                    "quantity": quantity,
                    "waitTime": wait_time,
                    "time_started": firestore.SERVER_TIMESTAMP,
                    "time_completed": None,
                    "price": price
                }

            order_ref.set(order_data)
            print(f"    ✅ Created {order_id} with dishes: {selected_dishes}")

        stall_ref.update({"estimatedWaitTime": total_wait_time})
        print(f"  ⏳ Set estimated wait time: {total_wait_time} mins")

print("\n🎉 All hawker centers and stalls seeded successfully in flattened structure!")

def delete_orders_and_reset_wait_time():
    # Function to recursively delete orders and reset wait times
    def process_collection(collection_ref):
        # Stream all documents in the current collection
        documents = collection_ref.stream()
        for document in documents:
            # Attempt to get the 'orders' subcollection
            orders_subcollection = document.reference.collection('orders')
            orders = orders_subcollection.stream()
            has_orders = False
            
            # Delete each order in the 'orders' subcollection
            for order in orders:
                has_orders = True
                print(f"Deleting order {order.id} from {document.id} in collection '{collection_ref.id}'")
                order.reference.delete()
            
            # If there were orders, reset the estimatedWaitTime
            if has_orders:
                document.reference.update({'estimatedWaitTime': 0})
                document.reference.update({'totalEarned': 0})
                print(f"Reset estimatedWaitTime & totalEarned to 0 for {document.id} in collection '{collection_ref.id}'")
            
            # Recursively process all subcollections
            subcollections = document.reference.collections()
            for subcollection in subcollections:
                process_collection(subcollection)

    # Retrieve all root-level collections and process each
    root_collections = db.collections()
    for root_collection in root_collections:
        process_collection(root_collection)

# delete_orders_and_reset_wait_time()
