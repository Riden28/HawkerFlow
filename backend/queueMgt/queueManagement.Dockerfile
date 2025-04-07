# Use official Python base image
FROM python:3.12-slim

# Set the working directory in the container
WORKDIR /app

# Copy requirements first for Docker caching
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files into the container
COPY queuemanagement.py .

# Expose the port the Flask app runs on
EXPOSE 5000

# Run the application using Gunicorn
CMD ["gunicorn", "-b", "0.0.0.0:5000", "queuemanagement:app"]
