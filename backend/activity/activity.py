import os
import json
import pika
import threading
from datetime import datetime
import time
from dotenv import load_dotenv
from flask import Flask, jsonify
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

def store_log(week_id: str, dish_name: str, dish_data: dict):
    """
    Stores one dish's log info in the Firestore collection for the given week_id.
    Expects dish_data to contain at least:
      - hawkerCenter
      - stallName
      - quantity
      - orderStartTime
      - orderEndTime
    """
    collection_ref = db.collection(week_id)

    # Count how many docs are already there (not always optimal for large sets)
    existing_logs = list(collection_ref.stream())
    next_id = f"log{len(existing_logs) + 1}"

    payload = {
        "hawkerCenter": dish_data.get("hawkerCenter"),
        "dishName": dish_name,
        "stallName": dish_data.get("stallName"),
        "quantity": dish_data.get("quantity"),
        "orderStartTime": dish_data.get("orderStartTime"),
        "orderEndTime": dish_data.get("orderEndTime")
    }

    collection_ref.document(next_id).set(payload)
    print(f"Logged dish '{dish_name}' into {week_id}/{next_id}")

def callback(ch, method, properties, body):
    """
    Called whenever a message arrives on the "Q_log" queue.
    Each message is expected to be a JSON object, e.g.:
    {
      "Chicken Rice": {
         "hawkerCenter": "Maxwell Food Centre",
         "stallName": "Tian Tian Hainanese Chicken Rice",
         "quantity": 2,
         "orderStartTime": "2025-04-04T12:00:00Z",
         "orderEndTime":   "2025-04-04T12:05:00Z"
      },
      "Other Dish": {...}
      ...
    }
    """
    try:
        message = json.loads(body)
        print("Received activity log")

        # Just grab the first dish to figure out what week it belongs to:
        # We'll assume every dish in this message shares the same startTime week
        first_dish = next(iter(message.values()))
        start_time = datetime.fromisoformat(
            first_dish["orderStartTime"].replace("Z", "+00:00")
        )
        week_id = get_week_id(start_time)

        # Iterate over every dish in the message
        for dish_name, data in message.items():
            store_log(week_id, dish_name, data)

    except Exception as e:
        print("Error while processing message:", e)

def run_consumer():
    """
    Runs a RabbitMQ consumer on a separate thread (daemon).
    Retries connection if RabbitMQ is not ready yet.
    """
    rabbit_host = os.environ.get("RABBITMQ_HOST", "localhost")
    
    connection = None
    for attempt in range(5):
        try:
            print(f"Attempt {attempt + 1}: Connecting to RabbitMQ at {rabbit_host}...")
            connection = pika.BlockingConnection(pika.ConnectionParameters(
                host=rabbit_host,
                heartbeat=10000,
                blocked_connection_timeout=300
            ))
            print("Connected to RabbitMQ.")
            break
        except pika.exceptions.AMQPConnectionError as e:
            print(f"RabbitMQ not ready. Retrying in 5 seconds... ({4 - attempt} retries left)")
            time.sleep(5)

    if connection is None:
        print("Failed to connect to RabbitMQ after multiple attempts.")
        return

    channel = connection.channel()
    channel.queue_declare(queue="Q_log", durable=True)
    channel.basic_consume(queue="Q_log", on_message_callback=callback, auto_ack=True)

    print("activityLog microservice listening on RabbitMQ topic 'Q_log'...")
    try:
        channel.start_consuming()
    except Exception as e:
        print("Consumer crashed:", e)


@app.route('/activity/logs/<string:week_id>', methods=['GET'])
def get_activity_logs(week_id):
    """
    Returns all logs for a specific week ID (e.g. 2025-wk13).
    """
    try:
        docs = db.collection(week_id).stream()
        logs = [doc.to_dict() for doc in docs]
        return jsonify(logs), 200
    except Exception as e:
        print(f"Failed to fetch {week_id}'s logs: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/activity/logs', methods=['GET'])
def get_current_week_logs():
    """
    Returns the logs for the current (UTC) week.
    """
    try:
        now = datetime.now()
        current_week_id = get_week_id(now)

        docs = db.collection(current_week_id).stream()
        logs = [doc.to_dict() for doc in docs]

        return jsonify(logs), 200
    except Exception as e:
        print(f"Failed to fetch current week logs: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Start the consumer in a background thread
    threading.Thread(target=run_consumer, daemon=True).start()
    app.run(debug=True, host='0.0.0.0', port=5004)