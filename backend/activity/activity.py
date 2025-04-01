import os
import json
import pika
import threading
from datetime import datetime
from dotenv import load_dotenv
from flask import Flask, jsonify
from pathlib import Path
from google.cloud import firestore
from google.oauth2 import service_account

# Load .env from root (../../.env)
load_dotenv()

# Firebase credentials
service_account_path = os.environ.get("FIREBASE_SERVICE_ACCOUNT_KEY_PATH")
project_id = os.environ.get("FIREBASE_PROJECT_ID")
database_id = "activity"

cred = service_account.Credentials.from_service_account_file(service_account_path)
db = firestore.Client(project=project_id, credentials=cred, database=database_id)

app = Flask(__name__)

# Calculate current week ID like "2025-wk13"
def get_week_id(timestamp: datetime) -> str:
    year, week_num, _ = timestamp.isocalendar()
    return f"{year}-wk{week_num:02d}"

# Firestore writer
def store_log(week_id, dish_name, dish_data):
    collection_ref = db.collection(week_id)
    existing_logs = list(collection_ref.stream())
    next_id = f"log{len(existing_logs) + 1}"

    payload = {
        "dishName": dish_name,
        "stallName": dish_data.get("stallName"),
        "quantity": dish_data.get("quantity"),
        "orderStartTime": dish_data.get("orderStartTime"),
        "orderEndTime": dish_data.get("orderEndTime")
    }

    collection_ref.document(next_id).set(payload)
    print(f"✅ Logged {dish_name} into {week_id}/{next_id}")

def callback(ch, method, properties, body):
    try:
        message = json.loads(body)
        print("📨 Received activity log")

        first_dish = next(iter(message.values()))
        start_time = datetime.fromisoformat(first_dish["orderStartTime"].replace("Z", "+00:00"))
        week_id = get_week_id(start_time)

        for dish_name, data in message.items():
            store_log(week_id, dish_name, data)

    except Exception as e:
        print("❌ Error:", e)

def run_consumer():
    rabbit_host = os.environ.get("RABBITMQ_HOST", "localhost")
    connection = pika.BlockingConnection(pika.ConnectionParameters(rabbit_host))
    channel = connection.channel()
    channel.queue_declare(queue="Q_log", durable=True)
    channel.basic_consume(queue="Q_log", on_message_callback=callback, auto_ack=True)
    print("🟢 activityLog microservice listening on RabbitMQ topic 'Q_log'...")
    channel.start_consuming()

@app.route('/activity/<string:week_id>', methods=['GET'])
def get_activity_logs(week_id):
    try:
        docs = db.collection(week_id).stream()
        logs = [doc.to_dict() | {"id": doc.id} for doc in docs]
        return jsonify(logs), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    threading.Thread(target=run_consumer, daemon=True).start()
    app.run(debug=True, host='0.0.0.0', port=5000)