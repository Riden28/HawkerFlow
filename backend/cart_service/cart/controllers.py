from flask import Blueprint, request, jsonify
from cart.services import (
    get_cart_items,
    add_to_cart,
    update_cart_item,
    remove_from_cart,
    clear_cart
)

cart_bp = Blueprint('cart', __name__)

@cart_bp.route('/', methods=['GET'])
def get_cart():
    """
    Retrieve all items in the user's cart.
    (In a real application, you'd identify the user by auth token or session.)
    """
    user_id = request.args.get('user_id', 'anonymous')
    items = get_cart_items(user_id)
    return jsonify({"user_id": user_id, "items": items}), 200

@cart_bp.route('/', methods=['POST'])
def add_item():
    """
    Add an item to the cart.
    Example JSON payload:
    {
        "user_id": "user123",
        "item_id": "abc123",
        "quantity": 2
    }
    """
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    if "user_id" not in data or "item_id" not in data or "quantity" not in data:
        return jsonify({"error": "Missing required fields"}), 400
    
    result = add_to_cart(data["user_id"], data["item_id"], data["quantity"])
    return jsonify(result), 200

@cart_bp.route('/<item_id>', methods=['PUT'])
def update_item(item_id):
    """
    Update an existing item's quantity in the cart.
    Example JSON payload:
    {
        "user_id": "user123",
        "quantity": 5
    }
    """
    data = request.json
    if not data or "user_id" not in data or "quantity" not in data:
        return jsonify({"error": "Missing data to update"}), 400
    
    result = update_cart_item(data["user_id"], item_id, data["quantity"])
    if not result:
        return jsonify({"error": "Item not found"}), 404
    return jsonify(result), 200

@cart_bp.route('/<item_id>', methods=['DELETE'])
def remove_item(item_id):
    """
    Remove a specific item from the cart.
    """
    user_id = request.args.get('user_id', None)
    if not user_id:
        return jsonify({"error": "User ID required"}), 400
    
    result = remove_from_cart(user_id, item_id)
    if not result:
        return jsonify({"error": "Item not found"}), 404
    return jsonify({"message": "Item removed"}), 200

@cart_bp.route('/clear', methods=['DELETE'])
def clear_cart_endpoint():
    """
    Completely clear the user's cart.
    """
    user_id = request.args.get('user_id', None)
    if not user_id:
        return jsonify({"error": "User ID required"}), 400
    
    clear_cart(user_id)
    return jsonify({"message": f"Cart for user {user_id} cleared."}), 200
