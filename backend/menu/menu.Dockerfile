# Use a lightweight base Python image
FROM python:3.12-slim

# Set the working directory
WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy your Python script into the container
COPY menu.py .

# Expose the port your Flask app runs on
EXPOSE 5001

# Run the application
CMD ["python", "menu.py"]
