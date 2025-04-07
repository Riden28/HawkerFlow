// Instead of calling the backend directly, we'll use Next.js proxy
const API_BASE_URL = '/app'
const API_BASE_URL_ORDER = '/app-order'
// const API_BASE_URL = 'http://localhost:5000'
// const API_BASE_URL_ORDER = 'http://localhost:5003'

// Types
export interface OrderItem {
  completed: boolean
  quantity: number
  waitTime: number
  time_started: string
  time_completed: string | null
  price: number  // Add the price field
}

export interface Order {
  userId: string
  phoneNumber: string
  [key: string]: OrderItem | string // For dynamic dish names
}
//API Functions for orders
export async function getStallsForHawkerCenter(hawkerId: string): Promise<string[]> {
  try {
    const encodedId = encodeURIComponent(hawkerId)
    const response = await fetch(`${API_BASE_URL_ORDER}/hawkerCenters/${encodedId}/stalls`)

    if (!response.ok) {
      throw new Error('Failed to fetch stalls for hawker center')
    }

    const data = await response.json()

    // Map to get only the stall names
    const stallNames = data.map((stall: any) => stall.stallName?.trim())

    return stallNames
  } catch (error) {
    console.error('Error fetching stalls:', error)
    throw error
  }
}


// API Functions
export async function getPendingOrders(hawkerCenter: string, hawkerStall: string): Promise<Record<string, Order>> {
  try {
    const correctedHawkerCenter = hawkerCenter.replace(/Centre/g, 'Center')
    const encodedHawkerCenter = encodeURIComponent(correctedHawkerCenter)
    const encodedHawkerStall = encodeURIComponent(hawkerStall)
    const response = await fetch(`${API_BASE_URL}/${encodedHawkerCenter}/${encodedHawkerStall}/pending_orders`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch pending orders')
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error fetching pending orders:', error)
    throw error
  }
}

export async function getCompletedOrders(hawkerCenter: string, hawkerStall: string): Promise<Record<string, Order>> {
  try {
    const correctedHawkerCenter = hawkerCenter.replace(/Centre/g, 'Center')
    const encodedHawkerCenter = encodeURIComponent(correctedHawkerCenter)
    const encodedHawkerStall = encodeURIComponent(hawkerStall)
    const response = await fetch(`${API_BASE_URL}/${encodedHawkerCenter}/${encodedHawkerStall}/completed_orders`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch completed orders')
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error fetching completed orders:', error)
    throw error
  }
}

export async function getWaitTime(hawkerCenter: string, hawkerStall: string): Promise<number> {
  try {
    const correctedHawkerCenter = hawkerCenter.replace(/Centre/g, 'Center')
    const encodedHawkerCenter = encodeURIComponent(correctedHawkerCenter)
    const encodedHawkerStall = encodeURIComponent(hawkerStall)
    const response = await fetch(`${API_BASE_URL}/${encodedHawkerCenter}/${encodedHawkerStall}/waitTime`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch wait time')
    }
    
    const data = await response.json()
    return data.waitTime
  } catch (error) {
    console.error('Error fetching wait time:', error)
    throw error
  }
}

export async function getTotalEarned(hawkerCenter: string, hawkerStall: string): Promise<number> {
  try {
    // Correct the hawker center name
    const correctedCenter = hawkerCenter.replace('Centre', 'Center')
    
    // Encode the parameters
    const encodedCenter = encodeURIComponent(correctedCenter)
    const encodedStall = encodeURIComponent(hawkerStall)
    
    // Construct the URL for the API call
    const url = `${API_BASE_URL}/${encodedCenter}/${encodedStall}/totalEarned`
    
    console.log('Fetching total earned amount from:', url)
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch total earned: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    console.log('Total earned response:', data)  // Log the response to see what we're getting
    return data.totalEarned || 0  // Changed from data.total to data.totalEarned
  } catch (err) {
    console.error('Error fetching total earned:', err)
    return 0
  }
}

export async function markDishComplete(
  hawkerCenter: string,
  hawkerStall: string,
  orderId: string,
  dishName: string
): Promise<void> {
  try {
    // First replace any 'Centre' with 'Center'
    const correctedHawkerCenter = hawkerCenter.replace(/Centre/g, 'Center')
    
    // Remove quantity prefix (e.g., "2x ") from dish name if present
    const cleanDishName = dishName.replace(/^\d+x\s+/, '')
    
    // Encode each part separately
    const urlParts = {
      hawkerCenter: encodeURIComponent(correctedHawkerCenter),
      hawkerStall: encodeURIComponent(hawkerStall),
      orderId: encodeURIComponent(orderId),
      dishName: encodeURIComponent(cleanDishName)
    }
    
    // Log the attempt first
    console.log('Attempting to complete dish:', {
      orderId,
      itemName: dishName,
      cleanName: cleanDishName,
      originalName: dishName,
      hawkerStall
    })
    
    // Construct the URL with encoded parts
    const url = `${API_BASE_URL}/${urlParts.hawkerCenter}/${urlParts.hawkerStall}/orders/${urlParts.orderId}/${urlParts.dishName}/complete`
    
    // Log the full request details
    console.log('Marking dish as complete:', {
      original: {
        hawkerCenter: correctedHawkerCenter,
        hawkerStall,
        orderId,
        dishName,
        cleanDishName
      },
      encoded: urlParts,
      url
    })
    
    // Send the update with the OrderItem structure
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        [cleanDishName]: {
          completed: true,
          time_completed: new Date().toISOString(),
          // Include these fields to match OrderItem interface
          quantity: parseInt(dishName.match(/^(\d+)x/)?.[1] || '1', 10),
          waitTime: 0, // This should be fetched from the order data
          time_started: new Date().toISOString()
        }
      })
    })

    // Log the raw response with more details
    console.log('Raw response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    })

    if (!response.ok) {
      let errorMessage = 'Failed to mark dish as complete'
      try {
        const errorData = await response.json()
        console.error('Server response:', errorData)
        errorMessage = errorData.error || errorMessage
        // Add more debug info
        console.error('Debug info:', {
          url,
          method: 'PATCH',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          dishName,
          cleanDishName,
          orderId,
          hawkerStall,
          hawkerCenter: correctedHawkerCenter,
          requestBody: {
            [cleanDishName]: {
              completed: true,
              time_completed: new Date().toISOString(),
              quantity: parseInt(dishName.match(/^(\d+)x/)?.[1] || '1', 10),
              waitTime: 0,
              time_started: new Date().toISOString()
            }
          }
        })
      } catch (e) {
        console.error('Error parsing response:', e)
        errorMessage = `${errorMessage}: ${response.statusText}`
      }
      throw new Error(errorMessage)
    }

    const result = await response.json()
    console.log('Success:', result)
    return result
  } catch (error) {
    console.error('Error marking dish as complete:', error)
    throw error
  }
} 