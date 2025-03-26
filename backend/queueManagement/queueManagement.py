from typing import List, Dict, Optional
from fastapi import FastAPI, Query
from pydantic import BaseModel
import firebase_admin
from firebase_admin import credentials, firestore

# Initialize Firebase Admin
cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# Reference to Firestore collection:
orders_collection = db.collection("queueOrders")

# -----------------------
# Pydantic Models
# -----------------------
class StallData(BaseModel):
    dishes: List[int]

class QueueOrder(BaseModel):
    orderId: int
    userId: int
    stalls: Dict[int, StallData]

class OrderStatusUpdate(BaseModel):
    orderStatus: str  # e.g. "completed"

# -----------------------
# FastAPI App
# -----------------------
app = FastAPI(title="Queue Management Microservice")

# ---------------------------------------------------
# 1) POST /api/queue
#    Receive order details from ORDER MANAGEMENT
#    Example input (Scenario 1):
#    {
#      "orderId": 12345,
#      "userId": 999,
#      "stalls": {
#         "1": { "dishes": [111, 112] },
#         "2": { "dishes": [210, 211] }
#      }
#    }
# ---------------------------------------------------
@app.post("/api/queue")
async def create_queue_order(queue_order: QueueOrder):
    """
    Receives a new order from Order Management and stores it in Firestore.
    Splits the order by stall, creating one Firestore document per stall.
    """
    try:
        # Prepare a batch write to Firestore
        batch = db.batch()
        
        for stall_id, stall_data in queue_order.stalls.items():
            doc_ref = orders_collection.document()  # auto-generate doc ID
            doc_data = {
                "orderId": queue_order.orderId,
                "userId": queue_order.userId,
                "stallId": int(stall_id),
                "orderStatus": "pending",
                "paymentStatus": "success",  # or from your order if needed
                "dishes": [{"dishId": d, "quantity": 1} for d in stall_data.dishes],
                "createdAt": firestore.SERVER_TIMESTAMP,
            }
            batch.set(doc_ref, doc_data)
        
        batch.commit()
        return {"message": "Order queued successfully."}
    except Exception as e:
        return {"error": str(e)}

# ---------------------------------------------------
# 2) GET /api/queue/wait-times
#    Returns estimated wait times for each stall
#    Example output (Scenario 1):
#    {
#      "waitTime": {
#         "stallId": {
#           "stallName": "string",
#           "estimatedWaitTime": int
#         },
#         ...
#      }
#    }
# ---------------------------------------------------
@app.get("/api/queue/wait-times")
async def get_wait_times():
    """
    Calculates a naive wait time for each stall by counting how many
    orders are not 'completed'. Then multiply count * average time (e.g. 5 mins).
    """
    try:
        # Query orders not completed
        incomplete_orders = orders_collection.where("orderStatus", "!=", "completed").stream()

        stall_counts = {}
        for doc in incomplete_orders:
            data = doc.to_dict()
            stall_id = data.get("stallId")
            if stall_id not in stall_counts:
                stall_counts[stall_id] = 0
            stall_counts[stall_id] += 1
        
        # Build response
        # For demonstration, assume each order takes 5 minutes
        response_data = {}
        for stall_id, count in stall_counts.items():
            response_data[stall_id] = {
                "stallName": f"Stall {stall_id}",
                "estimatedWaitTime": count * 5
            }
        
        return {"waitTime": response_data}
    except Exception as e:
        return {"error": str(e)}

# ---------------------------------------------------
# 3) GET /api/queue/hawker
#    Returns incomplete orders for the hawker UI
#    Example output (Scenario 2):
#    {
#      "orders": [
#        {
#          "orderId": 12345,
#          "userId": 999,
#          "stallId": 1,
#          "orderStatus": "pending",
#          "dishes": [
#            { "dishId": 111, "quantity": 2 },
#            ...
#          ],
#          "paymentStatus": "success"
#        }
#      ]
#    }
# ---------------------------------------------------
@app.get("/api/queue/hawker")
async def get_hawker_orders(stallId: Optional[int] = Query(None)):
    """
    Retrieve incomplete orders for the hawker UI.
    Optionally filter by stallId if provided.
    """
    try:
        query = orders_collection.where("orderStatus", "in", ["pending", "preparing"])
        if stallId is not None:
            query = query.where("stallId", "==", stallId)
        
        snapshot = query.stream()
        orders = []
        for doc in snapshot:
            data = doc.to_dict()
            orders.append({
                "docId": doc.id,  # Firestore document ID
                "orderId": data.get("orderId"),
                "userId": data.get("userId"),
                "stallId": data.get("stallId"),
                "orderStatus": data.get("orderStatus"),
                "dishes": data.get("dishes", []),
                "paymentStatus": data.get("paymentStatus")
            })
        
        return {"orders": orders}
    except Exception as e:
        return {"error": str(e)}

# ---------------------------------------------------
# 4) PUT /api/queue/hawker/{docId}
#    Mark an order as completed (Scenario 2)
#    Then "fire and forget" a notification to Notif & Customer UI
#    Example PUT body:
#    { "orderStatus": "completed" }
#
#    Example notification payload:
#    {
#      "orderId": int,
#      "userId": int,
#      "orderStatus": "completed"
#    }
# ---------------------------------------------------
@app.put("/api/queue/hawker/{docId}")
async def update_order_status(docId: str, statusUpdate: OrderStatusUpdate):
    """
    Updates the order status in Firestore and triggers a notification event.
    """
    try:
        doc_ref = orders_collection.document(docId)
        # Update Firestore
        doc_ref.update({"orderStatus": statusUpdate.orderStatus})
        
        # Fetch updated doc for notifications
        updated_doc = doc_ref.get().to_dict()
        notify_payload = {
            "orderId": updated_doc["orderId"],
            "userId": updated_doc["userId"],
            "orderStatus": updated_doc["orderStatus"]
        }

        # "Fire and forget" to your Notif service or Customer UI
        # This might be an HTTP request, a message queue publish, etc.
        # For demo, we'll just print it.
        print("Notif event:", notify_payload)

        return {"message": "Order updated and notification sent.", "notifPayload": notify_payload}
    except Exception as e:
        return {"error": str(e)}
