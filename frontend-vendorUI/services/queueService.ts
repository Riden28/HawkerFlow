// Queue Management API Service

// Define types based on the backend data structure
export interface OrderItem {
  name: string;
  quantity: number;
  waitTime: number;
  price: number;
  completed: boolean;
  time_started?: string;
  time_completed?: string;
}

export interface Order {
  id: string;
  userId: string;
  phoneNumber: string;
  [dishName: string]: any; // For dish items
}

export interface OrdersResponse {
  [orderId: string]: Order;
}

// Configuration
const API_BASE_URL = 'http://127.0.0.1:5000'; // Using localhost IP address
const HAWKER_CENTER = 'Maxwell Food Centre'; // Exact match with your backend
const HAWKER_STALL = 'Tian Tian Chicken Rice'; // Exact match with your backend

// API functions
export const fetchOrders = async (): Promise<OrdersResponse> => {
  try {
    const encodedCenter = encodeURIComponent(HAWKER_CENTER);
    const encodedStall = encodeURIComponent(HAWKER_STALL);
    const url = `${API_BASE_URL}/${encodedCenter}/${encodedStall}/orders`;
    
    console.log('Fetching orders from:', url);
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch orders: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Raw API response:', data);
    return data;
  } catch (error) {
    console.error('Error fetching orders:', error);
    throw error;
  }
};

export const completeDish = async (orderId: string, dishName: string): Promise<any> => {
  try {
    const encodedCenter = encodeURIComponent(HAWKER_CENTER);
    const encodedStall = encodeURIComponent(HAWKER_STALL);
    const encodedDish = encodeURIComponent(dishName);
    const url = `${API_BASE_URL}/${encodedCenter}/${encodedStall}/orders/${orderId}/${encodedDish}/complete`;
    
    console.log('Completing dish:', url);
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to complete dish: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Complete dish response:', data);
    return data;
  } catch (error) {
    console.error('Error completing dish:', error);
    throw error;
  }
};

// Helper function to transform backend order format to frontend format
export const transformOrders = (orders: OrdersResponse) => {
  return Object.entries(orders).map(([orderId, orderData]) => {
    // Extract dish items from the order
    const items = Object.entries(orderData)
      .filter(([key]) => !['userId', 'phoneNumber'].includes(key))
      .map(([dishName, dishData]: [string, any]) => ({
        id: dishName, // Using dish name as ID
        name: dishName,
        quantity: Number(dishData.quantity) || 1,
        waitTime: Number(dishData.waitTime) || 0,
        price: Number(dishData.price) || 0,
        options: [], // Backend doesn't provide options
        specialInstructions: '', // Backend doesn't provide special instructions
        completed: Boolean(dishData.completed),
        time_started: dishData.time_started,
        time_completed: dishData.time_completed,
      }));

    // Calculate total price
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Determine if all items are completed
    const allCompleted = items.every(item => item.completed);
    
    return {
      id: orderId,
      customerName: `Customer ${orderData.userId.substring(0, 5)}...`, // Anonymized customer name
      status: allCompleted ? "completed" as const : "pending" as const,
      total,
      items,
      paymentMethod: 'PayNow', // Default payment method
      orderNumber: parseInt(orderId.split('_')[1]) || parseInt(orderId) || 0, // Try to extract number from orderId
    };
  });
}; 