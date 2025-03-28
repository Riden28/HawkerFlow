FROM python:3.9-slim

# Create a directory for the app
WORKDIR /queueManagement

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application files
COPY . .

# Expose port 5001 for Flask
EXPOSE 5001

# Run the Flask app
CMD ["python", "queueManagement.py"]