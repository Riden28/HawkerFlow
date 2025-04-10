import pika, os, time

amqp_host = os.environ.get("RABBITMQ_HOST", "localhost")
amqp_port = 5672
order_exchange_name = "order_exchange"
queue_exchange_name = "queue_exchange"
order_exchange_type = "topic"
queue_exchange_type = "topic"

def wait_for_rabbitmq(host, port, retries=10):
    for i in range(retries):
        try:
            print(f"Attempt {i+1}: Connecting to {host}:{port}...")
            connection = pika.BlockingConnection(pika.ConnectionParameters(host=host, port=port))
            connection.close()
            print("RabbitMQ is ready!")
            return
        except pika.exceptions.AMQPConnectionError:
            print("RabbitMQ not ready yet. Retrying...")
            time.sleep(3)
    raise Exception("Failed to connect to RabbitMQ after multiple attempts")

wait_for_rabbitmq(amqp_host, amqp_port)

def create_exchange(hostname, port, exchange_name, exchange_type):
    print(f"Connecting to AMQP broker {hostname}:{port}...")
    # connect to the broker
    connection = pika.BlockingConnection(
        pika.ConnectionParameters(
            host=hostname,
            port=port,
            heartbeat=300,
            blocked_connection_timeout=300,
        )
    )
    print("Connected")

    print("Open channel")
    channel = connection.channel()

    # Set up the exchange if the exchange doesn't exist
    print(f"Declare exchange: {exchange_name}")
    channel.exchange_declare(
        exchange=exchange_name, exchange_type=exchange_type, durable=True
    )
    # 'durable' makes the exchange survive broker restarts

    return channel


def create_queue(channel, exchange_name, queue_name, routing_key):
    print(f"Bind to queue: {queue_name}")
    channel.queue_declare(queue=queue_name, durable=True)
    # 'durable' makes the queue survive broker restarts

    # bind the queue to the exchange via the routing_key
    channel.queue_bind(
        exchange=exchange_name, queue=queue_name, routing_key=routing_key
    )

#Queue Management
queue_channel = create_exchange(
    hostname=amqp_host,
    port=amqp_port,
    exchange_name=queue_exchange_name, #queue_exchange
    exchange_type=queue_exchange_type,
)

create_queue(
    channel=queue_channel,
    exchange_name=queue_exchange_name,  #queue_exchange
    queue_name="Q_notif",
    routing_key="*.notif",
)

create_queue(
    channel=queue_channel,
    exchange_name=queue_exchange_name, #queue_exchange
    queue_name="Q_log",
    routing_key="*.log",
)


#Order Management
order_channel = create_exchange(
    hostname=amqp_host,
    port=amqp_port,
    exchange_name=order_exchange_name, #order_exchange
    exchange_type=queue_exchange_type,
)

create_queue(
    channel=order_channel,
    exchange_name=order_exchange_name, #order_exchange
    queue_name="O_notif",
    routing_key="*.notif",
)

create_queue(
    channel=order_channel,
    exchange_name=order_exchange_name, #order_exchange
    queue_name="O_queue",
    routing_key="*.queue",
)