import os, pika, json, time
import threading
import pytz
from dotenv import load_dotenv
from flask import Flask, jsonify, abort
from google.cloud import firestore
from google.oauth2 import service_account
from apscheduler.schedulers.background import BackgroundScheduler
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS

# Load environment variables (if using a .env file)
load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Retrieve environment variables for credentials and project
service_account_path = os.environ.get("FIREBASE_SERVICE_ACCOUNT_KEY_PATH")
project_id = os.environ.get("FIREBASE_PROJECT_ID")
RABBITMQ_HOST = os.environ.get("RABBITMQ_HOST")
print(service_account_path)

if not service_account_path or not project_id:
    raise ValueError("Required environment variables are not set.")

# Create credentials from your service account JSON
cred = service_account.Credentials.from_service_account_file(service_account_path)
# Initialize the Firestore client
db = firestore.Client(project=project_id, credentials=cred, database='queue')

# RabbitMQ config
# Retry RabbitMQ connection if needed
connection = None
channel = None

def setup_rabbitmq_connection():
    global connection, channel
    max_retries = 10
    retry_delay = 3

    for attempt in range(1, max_retries + 1):
        try:
            print(f"Attempt {attempt}: Connecting to RabbitMQ at {RABBITMQ_HOST}...")
            connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_HOST, heartbeat=10000))
            channel = connection.channel()
            print("Connected to RabbitMQ")
            break
        except pika.exceptions.AMQPConnectionError as e:
            print(f"Connection failed: {e}")
            if attempt < max_retries:
                print("Retrying in 3 seconds...")
                time.sleep(retry_delay)
            else:
                print("Failed to connect to RabbitMQ after multiple attempts.")

EXCHANGE_NAME = 'queue_exchange'
QUEUE_NAME = 'O_queue'

###############################################################################
#Web Sockets!!!
###############################################################################
socketio = SocketIO(app, cors_allowed_origins="*")

@socketio.on('join_room', namespace='/customer_updates')
def handle_join(data):
    user_id = data.get('userId')
    join_room(user_id)  # This joins the client's socket to the room
    print(f" Joined room: {user_id}")

@socketio.on('leave_room', namespace='/customer_updates')
def handle_leave(data):
    user_id = data.get('userId')
    if user_id:
        leave_room(user_id)
        print(f"User left room: {user_id}")

@app.route('/test', methods=['GET'])
def test_route():
    return jsonify({"status": "queue is working"})

# socket.emit('leave_room', { userId: 'abc123' });
# socket.emit('join_room', { userId: 'abc123' });

###############################################################################
#Consume from RabbitMQ
###############################################################################
def process_order(ch, method, properties, body):
    try:
        # Decode the message body
        orderDetails = json.loads(body)
        print(f"Received order: {orderDetails['orderId']}")
                
        # Loop through each stall
        for stall_name, data in orderDetails["stalls"].items():
            # Reference to the stall document
            stall_ref = db.collection(orderDetails["hawkerCenter"]).document(stall_name)

            # Ensure estimatedWaitTime is added if not present
            stall_doc = stall_ref.get()
            if not stall_doc.exists:
                stall_ref.set({"estimatedWaitTime": 0})  # Init if needed
                stall_ref.set({"totalEarned": 0}) 

            # Reference to the order subcollection
            order_ref = stall_ref.collection("orders").document(orderDetails["orderId"])
            
            # Build the dish data
            dish_data = {}
            total_wait_time = 0
            order_data = {
                "userId": orderDetails["userId"],
                "phoneNumber": orderDetails["phoneNumber"]
            }

            for dish_info in data["dishes"]:
                dish_name = dish_info["name"]
                wait_time = dish_info["waitTime"]
                quantity = dish_info["quantity"]
                price = dish_info["price"]
                
                dish_data[dish_name] = {
                    "completed": False,
                    "quantity": quantity,
                    "time_started": firestore.SERVER_TIMESTAMP,
                    "time_completed": None,
                    "waitTime": wait_time,
                    "price": price,
                }

                total_wait_time += wait_time * quantity
                order_data.update(dish_data) 

            # Add dish data under the order document

            order_ref.set(order_data)

            # Optionally increment estimatedWaitTime (basic example)
            stall_ref.update({
                "estimatedWaitTime": firestore.Increment(total_wait_time)
            })

        print(f"Added Order {orderDetails['orderId']}")
    except Exception as e:
        print(f"Error processing order: {e}")

#Start consuming
def start_rabbitmq_consumer():
    channel.queue_declare(queue=QUEUE_NAME , durable=True)
    print(f"Listening for orders on queue: {QUEUE_NAME}")

    channel.basic_consume(queue=QUEUE_NAME, on_message_callback=process_order, auto_ack=True)

    try:
        channel.start_consuming()
    except KeyboardInterrupt:
        print("Stopped consuming.")
        channel.stop_consuming()
###############################################################################
#Publisher
###############################################################################
# RabbitMQ publish function
def publish_message(routing_key: str, message: dict):
    try:
        channel.basic_publish(
            exchange=EXCHANGE_NAME,
            routing_key=routing_key,
            body=json.dumps(message),
            properties=pika.BasicProperties(delivery_mode=2)
        )
        
        print(f"Published {routing_key}: {message}")
    except Exception as e:
        print(f"Failed to publish {routing_key}: {e}")

###############################################################################
#APIs
###############################################################################
#####GET - Scenario 1: Customer UI pulls current wait time######
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
        }),200

    except Exception as e:
        print(f"Error fetching wait time: {e}")
        abort(500, description="Internal server error.")

@app.route('/<hawkerCenter>/<hawkerStall>/totalEarned', methods=['GET'])
def get_total_earned(hawkerCenter, hawkerStall):
    try:
        # Reference to the hawker stall document
        doc_ref = db.collection(hawkerCenter).document(hawkerStall)
        doc = doc_ref.get()

        if not doc.exists:
            abort(404, description="Hawker stall not found.")

        data = doc.to_dict()
        total_earned = data.get('totalEarned')

        if total_earned is None:
            abort(404, description="Total earned not set for this stall.")

        return jsonify({
            "hawkerCenter": hawkerCenter,
            "hawkerStall": hawkerStall,
            "totalEarned": total_earned
        }),200

    except Exception as e:
        print(f"Error fetching wait time: {e}")
        abort(500, description="Internal server error.")


######GET - Scenario 2: Hawker UI pulls complete order list######
def is_order_completed(order_data):
    ignore = {"userId", "phoneNumber"}

    # print(f"Checking order: {order_data}")

    for key, value in order_data.items():
        if key in ignore: #skip fields 
            continue
        #checks the value is in dict & value of complete is False, it returns true & returns false immediately
        if not isinstance(value, dict) or not value.get("completed"): 
            print(f"Not completed: {key} -> {value}")
            return False
    return True


######GET - Scenario 2: Hawker UI pulls complete order list######
@app.route('/<hawkerCenter>/<hawkerStall>/orders', methods=['GET'])
def get_all_orders(hawkerCenter, hawkerStall):
    try:
        doc_ref = db.collection(hawkerCenter).document(hawkerStall)
        doc = doc_ref.get()

        if not doc.exists:
            abort(404, description="Hawker stall not found.")

        orders_ref = doc_ref.collection("orders")
        orders = orders_ref.stream()
        
        result = {}

        for order in orders:
            result[order.id] = order.to_dict()

        return jsonify(result),200
    
    except Exception as e:
        print(f"Error fetching all orders: {e}")
        abort(500, description="Internal server error.")

@app.route('/<hawkerCenter>/<hawkerStall>/completed_orders', methods=['GET'])
def get_completed_orders(hawkerCenter, hawkerStall):
    try:
        doc_ref = db.collection(hawkerCenter).document(hawkerStall)
        doc = doc_ref.get()

        if not doc.exists:
            abort(404, description="Hawker stall not found.")

        orders_ref = doc_ref.collection("orders")
        orders = orders_ref.stream()
        
        completed_orders = {}

        for order in orders:
            order_data = order.to_dict()
            # print(order_data)
            if is_order_completed(order_data):
                completed_orders[order.id] = order_data

        return jsonify(completed_orders),200
    
    except Exception as e:
        print(f"Error fetching completed orders: {e}")
        abort(500, description="Internal server error.")
    
@app.route('/<hawkerCenter>/<hawkerStall>/pending_orders', methods=['GET'])
def get_pending_orders(hawkerCenter, hawkerStall):
    try:
        doc_ref = db.collection(hawkerCenter).document(hawkerStall)
        doc = doc_ref.get()

        if not doc.exists:
            abort(404, description="Hawker stall not found.")

        orders_ref = doc_ref.collection("orders")
        orders = orders_ref.stream()
        
        pending_orders = {}

        for order in orders:
            order_data = order.to_dict()

            if not is_order_completed(order_data):
                pending_orders[order.id] = order_data

        return jsonify(pending_orders),200
    
    except Exception as e:
        print(f"Error fetching pending orders: {e}")
        abort(500, description="Internal server error.")

######PATCH - Scenario 2: Mark Order as Completed######
def build_activity_log_payload(order_data, hawkerCenter, hawkerStall):
    activity_log = {}

    for dish_name, dish_info in order_data.items():
        # Skip non-dish fields
        if dish_name in {"userId", "phoneNumber"}:
            continue

        start_time = dish_info.get("time_started")
        end_time = dish_info.get("time_completed")

        activity_log[dish_name] = {
            "stallName": hawkerStall,
            "quantity": dish_info.get("quantity"),
            "orderStartTime": start_time.isoformat(),
            "orderEndTime": end_time.isoformat(),
            "hawkerCenter": hawkerCenter
        }
    print(activity_log)
    return activity_log

@app.route('/<hawkerCenter>/<hawkerStall>/orders/<orderId>/<dishName>/complete', methods=['PATCH'])
def complete_dish(hawkerCenter, hawkerStall, orderId, dishName):
    try:
        order_ref = db.collection(hawkerCenter).document(hawkerStall).collection("orders").document(orderId)
        order_doc = order_ref.get()
        if not order_doc.exists:
            return {"error": "Order not found"}, 404
        
        order_data = order_doc.to_dict()

        # Get the wait time for this dish
        userId = order_data.get("userId")
        
        dish_data = order_data.get(dishName)
        if not dish_data:
            return {"error": "Dish not found in order"}, 404
        
        # Mark dish as completed
        updates = {
            f"{dishName}.completed": True,
            f"{dishName}.time_completed": firestore.SERVER_TIMESTAMP
        }
        order_ref.update(updates)

        dish_price= dish_data.get("price")
        if dish_price is None:
            return {"error": "Dish price not set"}, 400
        
        dish_time = dish_data.get("waitTime")
        if dish_time is None:
            return {"error": "Dish wait time not set"}, 400
        
        quantity = dish_data.get("quantity")
        if dish_time is None:
            return {"error": "Dish quantity not set"}, 400

        ##########################################################
        # Subtract dish wait time from stall's estimated wait time
        stall_ref = db.collection(hawkerCenter).document(hawkerStall)
        stall_doc = stall_ref.get()

        if not stall_doc.exists:
            return {"error": "Stall not found"}, 404

        stall_data = stall_doc.to_dict()
        current_wait_time = stall_data.get("estimatedWaitTime")

        if current_wait_time is None:
            return {"error": "Stall's estimated wait time not set"}, 400

        new_wait_time = max(current_wait_time - dish_time * quantity, 0)  # Avoid negative time
        stall_ref.update({"estimatedWaitTime": new_wait_time})

        ##########################################################
        # Add dish price to stall's total earned
        current_total_earned = stall_data.get("totalEarned")

        if current_total_earned is None:
            stall_ref.update({"totalEarned": 0})
        else:
            new_total_earned = max(current_total_earned + dish_price * quantity, 0)
            stall_ref.update({"totalEarned": new_total_earned})

        time.sleep(1)
        updated_order_data = order_ref.get().to_dict()
        ##########################################################
        #publish order
        if is_order_completed(updated_order_data):
            
            log_data = build_activity_log_payload(updated_order_data, hawkerCenter, hawkerStall)
            notif_data = {
                "orderId": orderId,
                "userId": userId,
                "stallName": hawkerStall,
                "phoneNumber": updated_order_data.get("phoneNumber"),
                "orderStatus": "completed"
            }
            publish_message(f"{orderId}.notif", notif_data)
            publish_message(f"{orderId}.log", log_data)

            # Emit WebSocket message to inform user to collect order
            print("User ID to emit to:", userId)

            socketio.emit(
                'order_ready',
                {'message': f'Your order is ready for collection from {hawkerStall}!'},
                namespace='/customer_updates',
                room='123'
            )

            return jsonify({
                "message": "Order fully completed and notifications published.",
                "orderId": orderId
            }), 200
        
        return jsonify({
            "message": f"'{dishName}' marked as completed, wait time updated.",
            "orderId": orderId
        }), 200

    except Exception as e:
        print(f"Error marking dish as complete: {e}")
        return {"error": "Internal server error"}, 500
    
###############################################################################
#deleting the orders from the db after 24hours
###############################################################################
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

scheduler = BackgroundScheduler()
# Schedule the function to run daily at 3 AM
scheduler.add_job(delete_orders_and_reset_wait_time, 'cron', hour=3, minute=0, second=0, timezone=pytz.timezone('Asia/Singapore'))
scheduler.start()

def safe_start():
    try:
        setup_rabbitmq_connection()
        if channel:
            start_rabbitmq_consumer()
        else:
            print("Channel not initialized. Skipping consumer startup.")
    except Exception as e:
        print(f"RabbitMQ consumer crashed: {e}")

if __name__ == '__main__':
    threading.Thread(target=safe_start, daemon=True).start()
    app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)







# orderDetails ={
#     "token": {
#         "card": {},
#         "client_ip": "58.182.136.164",
#         "created": 1743752552,
#         "id": "tok_1RAUM2FKfP7LOez7hS0UrTQH",
#         "livemode": False,
#         "object": "token",
#         "type": "card",
#         "used": False
#     },
#     "amount": 14,
#     "hawkerCenter": "test",
#     "orderId": "order_003",
#     "phoneNumber": "+6512345678",
#     "userId": "user_002",
#     "stalls": {
#     "Maxwell Fuzhou Oyster Cake": {
#         "dishes": [
#             {
#             "name": "Fried Carrot Cake",
#             "quantity": 1,
#             "waitTime": 6,
#             "price": 3.50
#             }
#         ]
#         },
#         "Tian Tian Hainanese Chicken Rice": {
#         "dishes": [
#             {
#             "name": "Chicken Rice",
#             "quantity": 2,
#             "waitTime": 10,
#             "price": 7
#             },
#             {
#             "name": "Iced Tea",
#             "quantity": 1,
#             "waitTime": 2,
#             "price": 3.50
#             }
#         ]
#     }
#     }
# }

# def process_order2(orderDetails):
#     try:
#         print(f"Received order: {orderDetails['orderId']}")
                
#         # Loop through each stall
#         for stall_name, data in orderDetails["stalls"].items():
#             # Reference to the stall document
#             stall_ref = db.collection(orderDetails["hawkerCenter"]).document(stall_name)

#             # Ensure estimatedWaitTime is added if not present
#             stall_doc = stall_ref.get()
#             if not stall_doc.exists:
#                 stall_ref.set({"estimatedWaitTime": 0})  # Init if needed
#                 stall_ref.set({"totalEarned": 0}) 

#             # Reference to the order subcollection
#             order_ref = stall_ref.collection("orders").document(orderDetails["orderId"])
            
#             # Build the dish data
#             dish_data = {}
#             total_wait_time = 0
#             order_data = {
#                 "userId": orderDetails["userId"],
#                 "phoneNumber": orderDetails["phoneNumber"]
#             }

#             for dish_info in data["dishes"]:
#                 dish_name = dish_info["name"]
#                 wait_time = dish_info["waitTime"]
#                 quantity = dish_info["quantity"]
#                 price = dish_info["price"]
                
#                 dish_data[dish_name] = {
#                     "completed": False,
#                     "quantity": quantity,
#                     "time_started": firestore.SERVER_TIMESTAMP,
#                     "time_completed": None,
#                     "waitTime": wait_time,
#                     "price": price,
#                 }

#                 total_wait_time += wait_time * quantity
#                 order_data.update(dish_data) 

#             # Add dish data under the order document

#             order_ref.set(order_data)

#             # Optionally increment estimatedWaitTime (basic example)
#             stall_ref.update({
#                 "estimatedWaitTime": firestore.Increment(total_wait_time)
#             })

#         print(f"Added Order {orderDetails['orderId']}")
#     except Exception as e:
#         print(f"Error processing order: {e}")

# process_order2(orderDetails)