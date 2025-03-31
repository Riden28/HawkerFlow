import os, pika, json, time
from dotenv import load_dotenv
from flask import Flask, jsonify, abort, request
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
db = firestore.Client(project=project_id, credentials=cred, database='queue')

#consume=====================================================================================================================================

#Consuming from RabbitMQ
RABBITMQ_HOST = 'rabbitmq'  #update
QUEUE_NAME = 'order_queue'  #update

def process_order(ch, method, properties, body):
    try:
        # Decode the message body
        orderDetails = json.loads(body)
        print(f"Received order: {orderDetails['orderId']}")
                
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
                "userId": orderDetails["userId"],
                "phoneNumber": orderDetails["phoneNumber"]
            }

            for dish_info in data["dishes"]:
                dish_name = dish_info["dishName"]
                wait_time = dish_info["waitTime"]
                quantity = dish_info["quantity"]
                
                dish_data[dish_name] = {
                    "completed": False,
                    "quantity": quantity,
                    "time_started": firestore.SERVER_TIMESTAMP,
                    "time_completed": None,
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

        print("Order {orderDetails['orderId']}")
    except Exception as e:
        print(f"Error processing order: {e}")

# Connect to RabbitMQ and start consuming
connection = pika.BlockingConnection(pika.ConnectionParameters(RABBITMQ_HOST))
channel = connection.channel()

channel.queue_declare(queue=QUEUE_NAME)
print(f"Listening for orders on queue: {QUEUE_NAME}")

channel.basic_consume(queue=QUEUE_NAME, on_message_callback=process_order, auto_ack=True)

try:
    channel.start_consuming()
except KeyboardInterrupt:
    print("Stopped consuming.")
    channel.stop_consuming()
    connection.close()

#publisher=====================================================================================================================================

# RabbitMQ config
RABBITMQ_HOST = 'rabbitmq'  # Use 'rabbitmq' if running via docker-compose
REPLY_QUEUE = 'dish_completed_queue'  # You can rename this

# RabbitMQ publish function
def publish_message(queue_name: str, message: dict):
    try:
        connection = pika.BlockingConnection(pika.ConnectionParameters(RABBITMQ_HOST))
        channel = connection.channel()
        channel.queue_declare(queue=queue_name, durable=True)
        channel.basic_publish(
            exchange='',
            routing_key=queue_name,
            body=json.dumps(message),
            properties=pika.BasicProperties(delivery_mode=2)
        )
        connection.close()
        print(f"Published to {queue_name}: {message}")
    except Exception as e:
        print(f"Failed to publish to {queue_name}: {e}")

#APIs=====================================================================================================================================

#GET - Scenario 2: Custoemr UI pulls current wait time
@app.route('/<hawkerCenter>/<hawkerStall>/waitTime', methods=['GET'])
def get_estimated_wait_time(hawkerCenter, hawkerStall):
    try:
        # Reference to the hawker stall document
        doc_ref = db.collection(hawkerCenter).document(hawkerStall)
        doc = doc_ref.get()

        if not doc.exists:
            abort(404, description="Hawker stall not found.")

        data = doc.to_dict()
        estimated_wait_time = data.get('estimatedWaitTime')

        if estimated_wait_time is None:
            abort(404, description="Estimated wait time not set for this stall.")

        return jsonify({
            "hawkerCenter": hawkerCenter,
            "hawkerStall": hawkerStall,
            "waitTime": estimated_wait_time
        })

    except Exception as e:
        print(f"Error fetching wait time: {e}")
        abort(500, description="Internal server error.")

#GET - Scenario 2: Hawker UI pulls complete order list
@app.route('/<hawkerCenter>/<hawkerStall>/orders', methods=['GET'])
def get_all_orders(hawkerCenter, hawkerStall):
    try:
        doc_ref = db.collection(hawkerCenter).document(hawkerStall)
        doc = doc_ref.get()

        if not doc.exists:
            abort(404, description="Hawker stall not found.")

        orders_ref = doc_ref.collection("order")
        orders = orders_ref.stream()
        
        result = {}

        for order in orders:
            result[order.id] = order.to_dict()

        return jsonify(result)
    
    except Exception as e:
        print(f"Error fetching orders: {e}")
        abort(500, description="Internal server error.")

#PATCH - Scenario 2: Mark Order as Completed
def is_order_completed(order_data):
    ignore = {"userId", "phoneNumber"}

    for key, value in order_data.items():
        if key in ignore: #skip fields 
            continue
        #checks the value is in dict & value of complete is False, it returns true & returns false immediately
        if not isinstance(value, dict) or not value.get("completed"): 
            return False
    return True

def build_activity_log_payload(order_data):
    activity_log = {}

    for dish_name, dish_info in order_data.items():
        # Skip non-dish fields
        if dish_name in {"userId", "email"}:
            continue

        activity_log[dish_name] = {
            "stallName": dish_info.get("stallName"),
            "quantity": dish_info.get("quantity"),
            "orderStartTime": dish_info.get("time_started"),
            "orderEndTime": dish_info.get("time_completed"),
        }

    return activity_log

@app.route('/<hawkerCenter>/<hawkerStall>/orders/<orderId>/<dishName>/complete', methods=['PATCH'])
def complete_dish(hawkerCenter, hawkerStall, orderId, dishName):
    try:
        order_ref = db.collection(hawkerCenter).document(hawkerStall).collection("order").document(orderId)

        order_snapshot = order_ref.get()
        if not order_snapshot.exists:
            return {"error": "Order not found"}, 404

        updates = {
            f"{dishName}.completed": True,
            f"{dishName}.time_completed": firestore.SERVER_TIMESTAMP
        }
        order_ref.update(updates)

        time.sleep(0.2)
        updated_order_data = order_ref.get().to_dict()

        #code here to update front ended

        #publish order
        if is_order_completed(updated_order_data):
            log_data = build_activity_log_payload(updated_order_data)
            notif_data = {
                "orderId": orderId,
                "userId": updated_order_data.get("userId"),
                "phoneNumber": updated_order_data.get("phoneNumber"),
                "orderStatus": "completed"
            }
            publish_message("Notif", notif_data)
            publish_message("Log", log_data)

            #deletes the order from db
            order_ref.delete()

            return jsonify({
                "message": "Order fully completed and notifications published.",
                "orderId": orderId
            }), 200
        
        return jsonify({
            "message": f"'{dishName}' marked as completed.",
            "orderId": orderId
        }), 200

    except Exception as e:
        print(f"Error completing dish: {e}")
        return {"error": "Internal server error"}, 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)