import json
from dateutil import parser as dtparser
import requests
from datetime import datetime
from collections import defaultdict

# Set your endpoints
ACTIVITY_SERVICE_URL = "http://localhost:5001/activity/2025-wk13"
MENU_SERVICE_URL = "http://localhost:5002/menu/waitTime"

def fetch_weekly_logs():
    try:
        response = requests.get(ACTIVITY_SERVICE_URL)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"❌ Failed to fetch activity logs: {e}")
        return []

def calculate_average_wait_times(logs):
    wait_times = defaultdict(list)

    for entry in logs:
        try:
            stall = entry["stallName"]
            dish = entry["dishName"]
            start_time = dtparser.parse(entry["orderStartTime"])
            end_time = dtparser.parse(entry["orderEndTime"])
            wait_time = (end_time - start_time).total_seconds() / 60.0
            wait_times[(stall, dish)].append(wait_time)
        except Exception as e:
            print(f"⚠️ Skipping invalid entry: {e}")
            continue

    aggregated = []
    for (stall, dish), times in wait_times.items():
        if times:
            avg_time = sum(times) / len(times)
            aggregated.append({
                "stallName": stall,
                "dishName": dish,
                "waitTime": round(avg_time, 2)
            })
    return aggregated

def update_menu_service(aggregated_data):
    try:
        response = requests.put(MENU_SERVICE_URL, json=aggregated_data)
        response.raise_for_status()
        print("✅ Menu service updated successfully.")
    except Exception as e:
        print(f"❌ Failed to update menu service: {e}")

def run_aggregator():
    print("📥 Fetching logs...")
    logs = fetch_weekly_logs()
    if not logs:
        print("🚫 No logs to process.")
        return

    print("📊 Aggregating wait times...")
    aggregated = calculate_average_wait_times(logs)

    print(f"📤 Sending aggregated data to menu service: {json.dumps(aggregated, indent=2)}")
    update_menu_service(aggregated)

if __name__ == "__main__":
    run_aggregator()