import uuid

# Simulated in-memory storage for demo purposes
PAYMENTS_DB = {}

def process_payment(data):
    """
    Process the payment. In real-world scenarios, this would integrate
    with external payment gateways, handle transactions, etc.
    """
    payment_id = str(uuid.uuid4())
    
    # Mock "processing" logic
    # In real code, you'd call the gateway API here
    if data.get("method") == "credit_card":
        status = "success"
    else:
        status = "failed"
    
    payment_record = {
        "payment_id": payment_id,
        "order_id": data["order_id"],
        "amount": data["amount"],
        "method": data["method"],
        "status": status
    }
    
    PAYMENTS_DB[payment_id] = payment_record
    
    return payment_record

def check_payment_status(payment_id):
    """
    Return payment status if it exists in our mock DB.
    """
    return PAYMENTS_DB.get(payment_id, None)
