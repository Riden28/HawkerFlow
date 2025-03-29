FROM python:3-slim
WORKDIR /usr/src/app
COPY requirements.txt ./
RUN python -m pip install --no-cache-dir -r http.reqs.txt
COPY ./API/stripe_api.py ./
CMD [ "python", "./stripe_api.py" ]