export interface OrderItem {
  id: string
  dishId: string
  quantity: number
  notes: string | null
  status: string
  dishName?: string
  dishPrice?: number
}

export interface Order {
  id: string
  restaurantId: string
  restaurantName?: string
  restaurantLogoUrl?: string | null
  tableId: string | null
  tableNumber?: number | null
  clientId: string | null
  createdAt: string
  items: OrderItem[]
  // null hasta que el cliente pide la cuenta
  total?: number | null
  pointsEarned?: number | null
  billedAt?: string | null
}

export interface OrderBill {
  orderId: string
  restaurantId: string
  clientId: string | null
  subtotal: number
  total: number
  pointsEarned: number
  pointsBalance: number | null
  billedAt: string
}
