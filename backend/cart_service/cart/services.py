# Mock in-memory "cart" storage
# Format: CART_DB[user_id] = { item_id: quantity }
CART_DB = {}

def get_cart_items(user_id):
    return CART_DB.get(user_id, {})

def add_to_cart(user_id, item_id, quantity):
    if user_id not in CART_DB:
        CART_DB[user_id] = {}
    user_cart = CART_DB[user_id]
    
    if item_id in user_cart:
        user_cart[item_id] += quantity
    else:
        user_cart[item_id] = quantity
    
    return {"message": "Item added", "cart": user_cart}

def update_cart_item(user_id, item_id, quantity):
    user_cart = CART_DB.get(user_id, None)
    if not user_cart or item_id not in user_cart:
        return None
    
    user_cart[item_id] = quantity
    return {"message": "Item updated", "cart": user_cart}

def remove_from_cart(user_id, item_id):
    user_cart = CART_DB.get(user_id, None)
    if not user_cart or item_id not in user_cart:
        return False
    
    del user_cart[item_id]
    return True

def clear_cart(user_id):
    CART_DB[user_id] = {}
