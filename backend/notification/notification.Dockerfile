# Use a lightweight base Python image
FROM python:3.12-slim

# Set the working directory
WORKDIR /app

# Copy in the requirements file and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the notification consumer script into the container
COPY notification.py .

# Since this service runs as a RabbitMQ consumer, no port is exposed
# Set the default command to run the notification consumer
CMD ["python", "notification.py"]
