# Use a lightweight base Python image
FROM python:3.12-slim

# Set a working directory
WORKDIR /app

# Copy in the requirements and install them
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy your order management script
COPY orderMgt.py .

# Expose the port Flask app is running on (for documentation)
EXPOSE 5003

# Define the default command to run service
CMD ["python", "orderManagement.py"]