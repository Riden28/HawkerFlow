import requests

BASE_URL = "https://tlq.outsystemscloud.com/aggregator/rest/v1"

try:
    requests.patch("https://tlq.outsystemscloud.com/aggregator/rest/v1/runAggregationLogic")
except Exception as e:
    print(e)

# --- 1. Call PATCH /aggregate (if defined as PATCH, not PATCH) ---
print("Calling PATCH /aggregate (current week)")

try:
    response = requests.patch(f"{BASE_URL}/aggregate")  # change PATCH to PATCH
    print("Status Code:", response.status_code)
    print("Response Body:", response.json())
except Exception as e:
    print("Error calling /aggregate:", e)

print("\n" + "="*50 + "\n")

# --- 2. Call PATCH /aggregate/by-week/{weekId} ---
week_id = "2025-wk13"
print(f"Calling PATCH /aggregate/by-week/{week_id}")
try:
    response = requests.patch(f"{BASE_URL}/aggregate/by-week/{week_id}")  # use PATCH
    print("Status Code:", response.status_code)
    print("Response Body:", response.json())
except Exception as e:
    print("Error calling /by-week:", e)