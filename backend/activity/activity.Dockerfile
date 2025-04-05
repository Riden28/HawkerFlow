# Use a lightweight base Python image
FROM python:3.9-slim

# Install system dependencies if needed (optional)
RUN apt-get update && apt-get install -y --no-install-recommends \
    # If you need any system packages, list them here.
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy your Python script into the container
COPY activity.py .

# Expose the port your Flask app runs on
EXPOSE 5008

# Run the application
CMD ["python", "activity.py"]