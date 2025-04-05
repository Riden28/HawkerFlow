const API_BASE_URL = 'http://localhost:5000'

// Types
export interface OrderItem {
  completed: boolean
  quantity: number
  waitTime: number
  time_started: string
  time_completed: string | null
}

export interface Order {
  userId: string
  phoneNumber: string
  [key: string]: any // For dynamic dish names
}

// API Functions
export async function getStallOrders(hawkerCenter: string, hawkerStall: string): Promise<Record<string, Order>> {
  try {
    const response = await fetch(`${API_BASE_URL}/${hawkerCenter}/${hawkerStall}/orders`)
    if (!response.ok) {
      throw new Error('Failed to fetch orders')
    }
    return await response.json()
  } catch (error) {
    console.error('Error fetching orders:', error)
    throw error
  }
}

export async function getWaitTime(hawkerCenter: string, hawkerStall: string): Promise<number> {
  try {
    const response = await fetch(`${API_BASE_URL}/${hawkerCenter}/${hawkerStall}/waitTime`)
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

export async function markDishComplete(
  hawkerCenter: string,
  hawkerStall: string,
  orderId: string,
  dishName: string
): Promise<void> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/${hawkerCenter}/${hawkerStall}/orders/${orderId}/${dishName}/complete`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
    if (!response.ok) {
      throw new Error('Failed to mark dish as complete')
    }
  } catch (error) {
    console.error('Error marking dish as complete:', error)
    throw error
  }
} 