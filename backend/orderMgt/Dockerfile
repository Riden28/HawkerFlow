# Use official Python base image
FROM python:3.11-slim

# Set the working directory inside the container
WORKDIR /app

# Copy the requirements file to leverage Docker caching
COPY requirements.txt .

# Install the Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the project files into the container
COPY . .

# Expose the port that Flask will run on
EXPOSE 5000

# Command to run the Order Management service
CMD ["python", "order_management.py"]
