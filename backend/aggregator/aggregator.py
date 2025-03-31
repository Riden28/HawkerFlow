# import os
# from flask import Flask, jsonify, request
# import requests
# from datetime import datetime, timedelta

# app = Flask(__name__)

# # Base URL for the Activity Log atomic microservice.
# # It is expected to have an endpoint (e.g. /orders/weekly) that accepts "start" and "end" query parameters.
# ACTIVITY_LOG_URL = os.environ.get("ACTIVITY_LOG_URL", "http://activity-log-service:5000")

# # Base URL for the Menu atomic microservice, which provides the PUT /menu/waitTime endpoint.
# MENU_SERVICE_URL = os.environ.get("MENU_SERVICE_URL", "http://menu-service:5000")

# # Dummy mappings for demonstration purposes.
# # In a real system, these mappings could come from a database or configuration.
# stall_mapping = {
#     "Tian Tian Hainanese Chicken Rice": 1,
#     "Another Stall": 2,
# }

# dish_mapping = {
#     # Mapping: (stallName, dishName) -> dishId
#     ("Tian Tian Hainanese Chicken Rice", "Chicken Rice"): 101,
#     ("Another Stall", "Some Dish"): 102,
# }

# def get_current_week_range():
#     """
#     Returns the start and end datetime for the current week.
#     We assume the week starts on Monday (00:00 UTC) and ends the following Monday.
#     """
#     now = datetime.utcnow()
#     start_of_week = now - timedelta(days=now.weekday())
#     start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
#     end_of_week = start_of_week + timedelta(days=7)
#     return start_of_week, end_of_week

# @app.route("/aggregate-and-update", methods=["GET"])
# def aggregate_and_update():
#     """
#     Aggregates the weekly orders for the current week, calculates the average wait time (in minutes)
#     for each dish, and then formats the data as a list of objects:
    
#     [
#       { 
#           "stallId": int,
#           "dishId": int,
#           "averageWaitTime": float
#       },
#       ...
#     ]
    
#     This list is then sent via a PUT request to the Menu microservice at the /menu/waitTime endpoint.
#     The Menu microservice response will indicate success or return an error if a matching document is not found.
#     """
#     # Get the current week's time range
#     start, end = get_current_week_range()
#     start_iso = start.isoformat() + "Z"
#     end_iso = end.isoformat() + "Z"

#     # Fetch weekly orders from the Activity Log microservice
#     try:
#         response = requests.get(
#             f"{ACTIVITY_LOG_URL}/orders/weekly",
#             params={"start": start_iso, "end": end_iso}
#         )
#         response.raise_for_status()
#     except requests.RequestException as e:
#         return jsonify({"error": "Failed to fetch weekly orders", "details": str(e)}), 500

#     weekly_orders = response.json()  # Expected to be a list of order records

#     # Aggregate wait times by (stallName, dishName)
#     aggregated_times = {}
#     for order in weekly_orders:
#         stall_name = order.get("stallName")
#         dish_name = order.get("dishName")
#         order_start_str = order.get("orderStartTime")
#         order_end_str = order.get("orderEndTime")
#         if not stall_name or not dish_name or not order_start_str or not order_end_str:
#             continue
#         try:
#             order_start = datetime.fromisoformat(order_start_str.replace("Z", "+00:00"))
#             order_end = datetime.fromisoformat(order_end_str.replace("Z", "+00:00"))
#         except Exception:
#             continue

#         # Calculate wait time in minutes
#         wait_time = (order_end - order_start).total_seconds() / 60.0
#         key = (stall_name, dish_name)
#         aggregated_times.setdefault(key, []).append(wait_time)

#     # Format aggregated data as a list of objects with numeric IDs and average wait times
#     aggregated_list = []
#     for (stall_name, dish_name), times in aggregated_times.items():
#         if times:
#             average_wait_time = sum(times) / len(times)
#             stall_id = stall_mapping.get(stall_name)
#             dish_id = dish_mapping.get((stall_name, dish_name))
#             # Skip if mappings are not found
#             if stall_id is None or dish_id is None:
#                 continue
#             aggregated_list.append({
#                 "stallId": stall_id,
#                 "dishId": dish_id,
#                 "averageWaitTime": average_wait_time
#             })

#     # Send the aggregated data to the Menu microservice via a PUT request
#     try:
#         update_response = requests.put(
#             f"{MENU_SERVICE_URL}/menu/waitTime",
#             json=aggregated_list
#         )
#         update_response.raise_for_status()
#     except requests.RequestException as e:
#         return jsonify({"error": "Failed to update wait times", "details": str(e)}), 500

#     return jsonify({
#         "message": "Aggregated wait times calculated and updated successfully",
#         "data": aggregated_list
#     }), 200

# if __name__ == '__main__':
#     app.run(host='0.0.0.0', port=5000, debug=True)
import os
from flask import Flask, jsonify, request
import requests
from datetime import datetime, timedelta

app = Flask(__name__)

# Base URL for the Activity Log atomic microservice.
# When testing locally without the actual activity log service, set MOCK_ACTIVITY_LOG to true.
ACTIVITY_LOG_URL = os.environ.get("ACTIVITY_LOG_URL", "http://activity-log-service:5000")
# Base URL for the Menu atomic microservice.
MENU_SERVICE_URL = os.environ.get("MENU_SERVICE_URL", "http://menu-service:5000")

# Use a flag to decide if dummy data should be used
MOCK_ACTIVITY_LOG = os.environ.get("MOCK_ACTIVITY_LOG", "false").lower() == "true"

def get_current_week_range():
    """
    Returns the start and end datetime for the current week.
    We assume the week starts on Monday (00:00 UTC) and ends the following Monday.
    """
    now = datetime.utcnow()
    start_of_week = now - timedelta(days=now.weekday())
    start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_week = start_of_week + timedelta(days=7)
    return start_of_week, end_of_week

@app.route("/aggregate-and-update", methods=["PUT"])
def aggregate_and_update():
    """
    Aggregates the weekly orders for the current week, calculates the average wait time (in minutes)
    for each dish, and then formats the data as a list of objects:
    
    [
      { 
          "stallName": string,
          "dishName": string,
          "waitTime": float
      },
      ...
    ]
    
    This list is then sent via a PUT request to the Menu microservice at the /menu/waitTime endpoint.
    """
    # Get the current week's time range
    start, end = get_current_week_range()
    start_iso = start.isoformat() + "Z"
    end_iso = end.isoformat() + "Z"

    # Use dummy data if MOCK_ACTIVITY_LOG is enabled
    if MOCK_ACTIVITY_LOG:
        weekly_orders = [
            {
                "stallName": "Tian Tian Hainanese Chicken Rice",
                "dishName": "Chicken Rice (Regular)",
                "orderStartTime": "2025-03-23T10:00:00Z",
                "orderEndTime": "2025-03-23T10:12:00Z"
            },
            {
                "stallName": "Tian Tian Hainanese Chicken Rice",
                "dishName": "Chicken Rice (Regular)",
                "orderStartTime": "2025-03-24T11:00:00Z",
                "orderEndTime": "2025-03-24T11:15:00Z"
            }
        ]
    else:
        try:
            response = requests.get(
                f"{ACTIVITY_LOG_URL}/orders/weekly",
                params={"start": start_iso, "end": end_iso}
            )
            response.raise_for_status()
            weekly_orders = response.json()
        except requests.RequestException as e:
            return jsonify({"error": "Failed to fetch weekly orders", "details": str(e)}), 500

    # Aggregate wait times by (stallName, dishName)
    aggregated_times = {}
    for order in weekly_orders:
        stall_name = order.get("stallName")
        dish_name = order.get("dishName")
        order_start_str = order.get("orderStartTime")
        order_end_str = order.get("orderEndTime")
        if not stall_name or not dish_name or not order_start_str or not order_end_str:
            continue
        try:
            order_start = datetime.fromisoformat(order_start_str.replace("Z", "+00:00"))
            order_end = datetime.fromisoformat(order_end_str.replace("Z", "+00:00"))
        except Exception:
            continue

        # Calculate wait time in minutes
        wait_time = (order_end - order_start).total_seconds() / 60.0
        key = (stall_name, dish_name)
        aggregated_times.setdefault(key, []).append(wait_time)

    # Format aggregated data as a list of objects with stallName, dishName, and waitTime
    aggregated_list = []
    for (stall_name, dish_name), times in aggregated_times.items():
        if times:
            average_wait_time = sum(times) / len(times)
            aggregated_list.append({
                "stallName": stall_name,
                "dishName": dish_name,
                "waitTime": average_wait_time
            })

    # Send the aggregated data to the Menu microservice via a PUT request
    try:
        update_response = requests.put(
            f"{MENU_SERVICE_URL}/menu/waitTime",
            json=aggregated_list
        )
        update_response.raise_for_status()
    except requests.RequestException as e:
        return jsonify({"error": "Failed to update wait times", "details": str(e)}), 500

    return jsonify({
        "message": "Aggregated wait times calculated and updated successfully",
        "data": aggregated_list
    }), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
