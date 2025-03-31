# Use an official Python runtime as a base image
FROM python:3.9-slim

# Prevent Python from writing pyc files to disk and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file and install dependencies
COPY requirements.txt /app/requirements.txt
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copy the rest of the application code into the container
COPY . /app

# Expose port 5000 for the Flask app
EXPOSE 5000

# Set the default command to run your app
CMD ["python", "app.py"]
