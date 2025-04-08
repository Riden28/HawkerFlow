
# HawkerFlow

HawkerFlow is a modern web application that revolutionises the hawker center dining experience in Singapore. 

It allows users to browse, order, and pay for food from multiple hawker stalls through a single platform, reducing wait times and improving the overall dining experience.


## Features

**Customer Side**
- **Multi-Stall Ordering**: Order from multiple hawker stalls in a single transaction
- **Real-Time Menu**: Browse menus with prices, images, and wait times
- **Cart System**: Manage items from different stalls with a unified cart
- **Payment Method**: Credit Card (via Stripe)
- **Order Tracking**: Real-time updates on order status
- **SMS Notifications**: Receive SMS alerts when your order is ready for collection
- **Responsive Design**: Works seamlessly on desktop and mobile devices

**Vendor Side**
- **Order Management Dashboard**: View and manage incoming orders in real-time
  - Summary cards showing total pending orders
  - Summary cards showing total completed orders
  - Daily revenue tracking and earnings summary
- **Order Status Updates**: Mark orders as pending or completed
## Prerequisites
- Next.js 14 
- React
- TypeScript
- Tailwind CSS
- Shadcn UI Components
- Chart.js 
- Firebase 
- RabbitMQ 
- Docker
## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/hawkerflow.git
cd hawkerflow
```

2. Install customer frontend dependencies:
```bash
cd frontend
pnpm install
```

3. Install vendor frontend dependencies:
```bash
cd frontend-vendorUI
pnpm install
```

4. Set up environment variables:

For customer frontend, create a `.env.local` file in the frontend directory:
```
# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = your_stripe_publishable_key
```

For backend, create a `.env` file in the backend directory:
```
# Stripe Configuration
STRIPE_SECRET_KEY = your_stripe_secret_key

# Firebase Configuration
FIREBASE_PROJECT_ID = your_firebase_project_id
FIREBASE_SERVICE_ACCOUNT_KEY_PATH = path_to_your_firebase_service_account_key.json

# Twilio Configuration
TWILIO_ACCOUNT_SID = your_twilio_account_SID
TWILIO_AUTH_TOKEN = your_twilio_authentication_token
TWILIO_PHONE_NUMBER = your_phone_number

# Backend Services
RABBITMQ_HOST = rabbitmq
```
## Running the Application
1. Start the customer frontend:
```bash
cd frontend
pnpm run dev
```

2. Start the vendor frontend (in a new terminal):
```bash
cd frontend-vendorUI
pnpm run dev
```

3. Start the backend server (in a new terminal):
```bash
cd backend
docker network create hawker-network
docker-compose up --build
```
## External APIs Used
- Stripe
    - To generate a token on the front end for Payment ([Link to Documentation](https://docs.stripe.com/js/tokens/create_token?type=cardElement))
    - Create and confirm payment transaction on the backend ([Link to Documentation](https://docs.stripe.com/api/payment_methods?lang=python))

- Twilio 
    - To send a notification message to the user once PAYMENT and order are successful ([Link to Documentation](https://www.twilio.com/docs/messaging/quickstart/python#send-an-outbound-sms-with-python))
## API Keys (FOR IS213 INSTRUCTORS)
Attached in the project submission will be two .env files which contain our Stripe and Twilio API keys.

.env file should be placed in the following folder in the repo.
```
|-- HawkerFlow
|  |-- backend
|  |  |-- .env
      #etc
```

.env.local file should be placed in the following folder in the repo.
```
|-- HawkerFlow
|  |-- frontend
|  |  |-- .env.local
      #etc
```
## Usage
**For Hawker Customers:**
- Order food at hawker centers

**For Hawker Vendors:**
- View all pending and completed orders
- View total amount earned in a day
## Contact
Project Link: https://github.com/Riden28/HawkerFlow