# Use slim Python base image
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the RabbitMQ setup script
COPY amqp_setup.py .

# Default command to run your setup script
CMD ["python", "amqp_setup.py"]