# Use an official Python runtime as a parent image
FROM python:3.12-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file and install dependencies
COPY requirements.txt .
RUN python -m pip install --no-cache-dir -r requirements.txt

# Copy the payment script into the container
COPY payment.py .

# Expose the port your Flask app runs on (for documentation)
EXPOSE 5002

# Run the application using Gunicorn.
# This command binds Gunicorn to all interfaces on port 5002 and instructs it to load the Flask app instance
# (named "app") from the payment module.
CMD ["gunicorn", "-b", "0.0.0.0:5002", "payment:app"]