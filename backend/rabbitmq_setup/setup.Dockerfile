# Use slim Python base image
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Copy requirements and install them
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the RabbitMQ setup script
COPY amqp_setup.py .

# Since this script runs a one-off RabbitMQ setup, no port is exposed.
# Default command to run your setup script
CMD ["python", "amqp_setup.py"]