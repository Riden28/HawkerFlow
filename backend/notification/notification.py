#!/usr/bin/env python3
# import amqp_connection
import json
import pika
from amqp_setup import get_channel
from dotenv import load_dotenv
import os


load_dotenv()

# twilio set up
import os
from twilio.rest import Client

#from .env
account_sid = os.environ.get("TWILIO_ACCOUNT_SID")
auth_token = os.environ.get("TWILIO_AUTH_TOKEN")
twilio_phone_number = os.environ.get("TWILIO_PHONE_NUMBER")

#for testing.
# message_body = "hello world"
# contact = "+6597730551"

client = Client(account_sid, auth_token)
#end of twilio set up 

""" 
DS from order management #scenario 1: notify payment and order success

notificationRequest: {
    emailID: "string",
    orderId: int,
    "paymentStatus": "string" // e.g., "success", "failed",
    "paymentNnumber":"+65xxxxxxxx"
}

DS from queuemanagement #scenario 2: notify order completed
{
    "orderId": int,
    "userId": int,
    "orderStatus": "completed",
    "paymentNumber":"+65xxxxxxxx"
}
"""


# set up the consumer for both payment completed and order completed
def receiveNotification():
    try:
        channel = get_channel()
        
        #queue name 
        order_completed_queue_name = "Q_notif"
        payment_completed_queue_name = "O_notif"

        # set up a consumer and start to wait for coming messages
        channel.basic_consume(queue=order_completed_queue_name, on_message_callback=callbackOrderCompletedNotification, auto_ack=True)
        channel.basic_consume(queue=payment_completed_queue_name, on_message_callback=callbackPaymentCompletedNotification, auto_ack=True)

        channel.start_consuming() # an implicit loop waiting to receive messages; 
        #it doesn't exit by default. Use Ctrl+C in the command window to terminate it.
        print("Notification_Log: Consuming from queue:",  f'{order_completed_queue_name}')
        print("Notification_Log: Consuming from queue:",  f'{payment_completed_queue_name}')
    
    except pika.exceptions.AMQPError as e:
        print(
            f"Notification_Log: Failed to connect: {e}"
        )  # might encounter error if the exchange or the queue is not created

    except KeyboardInterrupt:
        print("Notification_Log: Program interrupted by user.")

#Callback fucntion to keep listening  for notifications from queue management
def callbackOrderCompletedNotification(channel, method, properties, body): # required signature for the callback; no return
    print("\nReceived a Notification by " + __file__)
    processOrderCompletedNotification(body)
    print() # print a new line feed
    

# to edit 
def processOrderCompletedNotification(body):
    try:
        data = json.loads(body)

        if "orderStatus" in data :
            payment_status = data["orderStatus"]
            contact = data.get("phoneNumber")  # Use `.get()` to avoid KeyErrors

            if "completed" in payment_status:
                message_body = "Your orders have been completed."
                send_sms(contact, message_body)
                return
            else:
                print(f"Unexpected order status: {payment_status}")

    except json.JSONDecodeError:
        print("Error: Failed to parse JSON.")
    except Exception as e:
        print(f"Unexpected error: {e}")
        

#Callback fucntion to keep listening  for notifications from queue management
def callbackPaymentCompletedNotification(channel, method, properties, body): # required signature for the callback; no return
    print("\nReceived a Notification by " + __file__)
    processPaymentCompletedNotification(body)
    print() # print a new line feed

def processPaymentCompletedNotification(body):
    try:
        data = json.loads(body)

        if "paymentStatus" in data:
            payment_status = data["paymentStatus"]
            contact = data.get("phoneNumber")  # Use `.get()` to avoid KeyErrors

            if "completed" in payment_status:
                message_body = "Your payment has been received."
                send_sms(contact, message_body)
                return
        
            else:
                print(f"Unexpected payment status: {payment_status}")

    except json.JSONDecodeError:
        print("Error: Failed to parse JSON.")
    except Exception as e:
        print(f"Unexpected error: {e}")
  

#twilio send sms function for messages from both queues
def send_sms(contact, message_body):
    # use twilio to send message
    try:
        message = client.messages.create(
            body=message_body, from_=twilio_phone_number, to=contact
        )
        print(f"Message sent to {contact}, SID: {message.sid}")
    except Exception as e:
        print(f"Failed to send message to {contact}: {e}")


if (
    __name__ == "__main__"
):  # execute this program only if it is run as a script (not by 'import')
    print("Notification_Log: Getting Connection")
    print("Notification_Log: Connection established successfully")
    receiveNotification()

