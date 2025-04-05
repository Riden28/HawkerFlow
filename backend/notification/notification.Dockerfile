# Use a lightweight base Python image
FROM python:3.12-slim

# Set a working directory
WORKDIR /app

# Copy in the requirements and install them
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy notification script into the container
COPY notification.py .

# By default, this service runs as a RabbitMQ consumer, so there's no need to EXPOSE a port

# Set the default command to run the notification consumer
CMD ["python", "notification.py"]
