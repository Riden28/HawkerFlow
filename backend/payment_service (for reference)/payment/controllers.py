from flask import Blueprint, request, jsonify
from payment.services import process_payment, check_payment_status

payment_bp = Blueprint('payment', __name__)

@payment_bp.route('/pay', methods=['POST'])
def pay():
    """
    Endpoint to handle payment initiation.
    Example JSON payload:
    {
        "amount": 12.50,
        "method": "credit_card",
        "order_id": "abc123"
    }
    """
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    # Perform basic validation
    if "amount" not in data or "method" not in data or "order_id" not in data:
        return jsonify({"error": "Missing required fields"}), 400
    
    result = process_payment(data)
    
    if result['status'] == 'success':
        return jsonify(result), 200
    else:
        return jsonify(result), 400


@payment_bp.route('/status/<payment_id>', methods=['GET'])
def status(payment_id):
    """
    Endpoint to check the status of a payment by its ID.
    """
    result = check_payment_status(payment_id)
    
    if not result:
        return jsonify({"error": "Payment not found"}), 404
    return jsonify(result), 200
