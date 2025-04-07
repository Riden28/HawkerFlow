# Use a lightweight base Python image
FROM python:3.12-slim

# Set a working directory
WORKDIR /app

# Copy in the requirements and install them
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy your order management script
COPY ordermanagement.py .

# Expose the port your Flask app runs on (for documentation)
EXPOSE 5003

# Run the application using Gunicorn
CMD ["gunicorn", "-b", "0.0.0.0:5003", "ordermanagement:app"]