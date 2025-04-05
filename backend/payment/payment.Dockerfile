# Use an official Python runtime as a parent image
FROM python:3.12-slim

# Set the working directory in the container
WORKDIR /app

# Copy the current directory contents into the container at /usr/src/app
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN python -m pip install --no-cache-dir -r requirements.txt

COPY ./payment.py ./

EXPOSE 5002

# Run app.py when the container launches
CMD ["python", "./payment.py"]