@app.route("/menu/<string:hawkerCenter>", methods=["GET"])
def get_stalls_for_hawker_center(hawkerCenter):
    """
    GET /menu/<hawkerCenter>
    Proxies the request to the MENU microservice to retrieve the list of stalls.
    Outbound API Call: GET /menu/<hawkerCenter> on MENU service.
    """
    try:
        url = f"{MENU_SERVICE_URL}/menu/{hawkerCenter}"
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            return jsonify(response.json()), 200
        else:
            return jsonify({"error": f"Failed to retrieve stall list. Status code: {response.status_code}"}), response.status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
    
@app.route("/menu/<string:hawkerCenter>/<string:hawkerStall>", methods=["GET"])
def get_menu_for_stall(hawkerCenter, hawkerStall):
    """
    GET /menu/<hawkerCenter>/<hawkerStall>
    Proxies the request to the MENU microservice to retrieve the dish menu for a specific stall.
    Outbound API Call: GET /menu/<hawkerCenter>/<hawkerStall> on MENU service.
    """
    try:
        url = f"{MENU_SERVICE_URL}/menu/{hawkerCenter}/{hawkerStall}"
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            return jsonify(response.json()), 200
        else:
            return jsonify({"error": f"Failed to retrieve menu items. Status code: {response.status_code}"}), response.status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 500