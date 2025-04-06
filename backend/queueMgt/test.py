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

import os, random
from google.cloud import firestore
from google.oauth2 import service_account
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
service_account_path = os.environ.get("FIREBASE_SERVICE_ACCOUNT_KEY_PATH")
project_id = os.environ.get("FIREBASE_PROJECT_ID")

cred = service_account.Credentials.from_service_account_file(service_account_path)
db = firestore.Client(project=project_id, credentials=cred, database='queue')

# 🔖 Configuration
hawker_centres = [
    "Bukit Timah",
    "Lagoon Hawker Center",
    "Maxwell Food Center"
]

stalls = {
    "Tian Tian Chicken Rice": ["Chicken Rice", "Roasted Chicken", "Egg", "Cucumber"],
    "Ah Heng Curry Chicken Bee Hoon Mee": ["Fishball Noodles", "Laksa", "Wanton Mee"]
}

# 🔁 Create each hawker centre with 2 stalls and 4 orders each
for centre in hawker_centres:
    print(f"\n🏢 Setting up Hawker Centre: {centre}")

    for stall_name, dishes in stalls.items():
        print(f"  🍽️ Stall: {stall_name}")

        # Create or reset stall doc
        stall_ref = db.collection(centre).document(stall_name)
        stall_ref.set({"estimatedWaitTime": 0})

        stall_total_wait = 0
        order_counter = 1  # Reset per stall

        for _ in range(4):  # 4 orders
            order_id = f"order_{order_counter:03d}"
            order_counter += 1

            # 🔁 Subcollection is now 'orders' (plural)
            order_ref = stall_ref.collection("orders").document(order_id)

            order_data = {
                "userId": f"user_{stall_name[:3]}_{order_id}",
                "phoneNumber": f"9123{random.randint(1000,9999)}"
            }

            selected_dishes = random.sample(dishes, 2)

            for dish in selected_dishes:
                quantity = random.randint(1, 3)
                wait_time = random.randint(5, 10)
                price = random.randint(1, 5)
                total_dish_wait = wait_time * quantity

                stall_total_wait += total_dish_wait

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

        # Update accurate total wait time
        stall_ref.update({"estimatedWaitTime": stall_total_wait})
        stall_ref.update({"totalEarned": 0})
        print(f"  ⏳ Estimated wait time set: {stall_total_wait} mins")

print("\n🎉 All hawker centres seeded successfully with clean order IDs and 'orders' subcollections!")