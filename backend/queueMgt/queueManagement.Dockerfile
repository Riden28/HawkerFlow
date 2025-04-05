# Use official Python base image
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Copy requirements first (for Docker caching)
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files into the container
COPY queueMgt.py .

# Expose Flask port
EXPOSE 5000

# Run the main script
CMD ["python", "queueMgt.py"]