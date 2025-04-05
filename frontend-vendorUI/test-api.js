// Test script to verify backend connection
const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:5000';
const HAWKER_CENTER = 'maxwell Food centre';
const HAWKER_STALL = 'Tian Tian Hainanese Chicken Rice';

async function testBackendConnection() {
  console.log('Testing backend connection...');
  console.log(`URL: ${API_BASE_URL}/${HAWKER_CENTER}/${HAWKER_STALL}/orders`);
  
  try {
    const response = await fetch(`${API_BASE_URL}/${HAWKER_CENTER}/${HAWKER_STALL}/orders`);
    
    if (!response.ok) {
      console.error(`Error: ${response.status} ${response.statusText}`);
      return;
    }
    
    const data = await response.json();
    console.log('Connection successful!');
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    // Count orders
    const orderCount = Object.keys(data).length;
    console.log(`Total orders: ${orderCount}`);
    
    // Check if there are any orders
    if (orderCount === 0) {
      console.log('No orders found. Make sure your backend is properly configured and has data.');
    }
  } catch (error) {
    console.error('Connection failed:', error.message);
    console.log('\nTroubleshooting tips:');
    console.log('1. Make sure your backend server is running');
    console.log('2. Check if the API URL is correct');
    console.log('3. Verify that the hawker center and stall names match exactly');
    console.log('4. Check for CORS issues in your browser console');
  }
}

testBackendConnection(); 