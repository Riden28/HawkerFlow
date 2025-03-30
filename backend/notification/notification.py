#!/usr/bin/env python3
# import amqp_connection
import json
import pika
#import amqp_setup
from os import environ

#from dotenv import load_dotenv
#load_dotenv()

# twilio set up
import os
from twilio.rest import Client

#from .env
# account_sid = os.getenv("TWILIO_ACCOUNT_SID")
# auth_token = os.getenv("TWILIO_AUTH_TOKEN")
# twilio_phone_number = os.getenv("TWILIO_PHONE_NUMBER")

#for testing
account_sid = "ACe9d633942cc908a6bf389ac28800f2af"
auth_token = "fa1db3e25f403916e86dc9eb1dc826bb"
twilio_phone_number = "+15049772047"
message_body = "hello world"
contact = "+6597730551"

client = Client(account_sid, auth_token)
#end of twilio set up 


#set up the consumer 
def receiveNotification():
    try:
        amqp_setup.check_setup()
        
        queue_name = "<insert the queue name>"   

        # set up a consumer and start to wait for coming messages
        amqp_setup.channel.basic_consume(queue=queue_name, on_message_callback=callback, auto_ack=True)
        amqp_setup.channel.start_consuming() # an implicit loop waiting to receive messages; 
        #it doesn't exit by default. Use Ctrl+C in the command window to terminate it.
        print("Notification_Log: Consuming from queue:", "<insert the queue name>")
    
    except pika.exceptions.AMQPError as e:
        print(
            f"Notification_Log: Failed to connect: {e}"
        )  # might encounter error if the exchange or the queue is not created

    except KeyboardInterrupt:
        print("Notification_Log: Program interrupted by user.")

#Callback fucntion to keep listening 
def callback(channel, method, properties, body): # required signature for the callback; no return
    print("\nReceived a Notification by " + __file__)
    processNotification(body)
    print() # print a new line feed
    
""" 
##note: check with the team if u need set up 2 consumer listening to 2 
DS from order management #scenario 1: notify payment and order success

notificationRequest: {
    emailID: "string",
    orderId: int,
    paymentStatus: "string" // e.g., "success", "failed"
    #need the phonenumber
}

DS from queuemanagement #scenario 2: notify order completed
{
    "orderId": int,
    "userId": int,
    "orderStatus": "completed"
    #need the phonenumber 
}
"""

#to edit 
def processNotification(body):
    try:
        data = json.loads(body)
        if "paymentStatus" in data:
            message_body = data["paymentStatus"]
            contact = data["phoneNumber"]
            send_sms(contact, message_body)
            return 
        
        if "orderStatus" in data:
            message_body = data["orderStatus"]
            contact = data["phoneNumber"]
            send_sms(contact, message_body)
            return 
            
    except Exception as e:
        print("--NOT JSON:", e)
        print("--DATA:", body)
    print()
        

#twilio send sms function 
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
    connection = amqp_connection.create_connection()  # get the connection to the broker
    print("Notification_Log: Connection established successfully")
    channel = connection.channel()
    receiveNotification(channel)

