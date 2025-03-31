FROM python:3.10-slim

WORKDIR /app

COPY activity.py .
COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

ENV PYTHONUNBUFFERED=1

CMD ["python", "activity.py"]
