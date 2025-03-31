import pika

amqp_host = "localhost"
amqp_port = 5672
order_exchange_name = "order_exchange"
queue_exchange_name = "queue_exchange"
exchange_type = "topic"

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
    exchange_type=exchange_type,
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

create_queue(
    channel=queue_channel,
    exchange_name=queue_exchange_name, #queue_exchange
    queue_name="Q_customer",
    routing_key="*.customer",
)

#Order Management
order_channel = create_exchange(
    hostname=amqp_host,
    port=amqp_port,
    exchange_name=order_exchange_name, #order_exchange
    exchange_type=exchange_type,
)

create_queue(
    channel=queue_channel,
    exchange_name=order_exchange_name, #order_exchange
    queue_name="O_notif",
    routing_key="*.notif",
)

create_queue(
    channel=queue_channel,
    exchange_name=order_exchange_name, #order_exchange
    queue_name="O_queue",
    routing_key="*.queue",
)