export type OrderStatus = 'pendiente' | 'preparando' | 'listo' | 'entregado'

export interface OrderItem {
  id: string
  dishId: string
  quantity: number
  notes: string | null
  status: OrderStatus
  dishName?: string
  dishPrice?: number
  dishCategory?: string
  // Packs: los platos de un mismo pack comparten packLineId (null en un plato suelto)
  packId?: string | null
  packLineId?: string | null
  packName?: string | null
  packPrice?: number | null
}

export interface Order {
  id: string
  restaurantId: string
  tableId: string | null
  tableNumber: number | null
  clientId: string | null
  createdAt: string
  items: OrderItem[]
}

export interface UpdateOrderItemStatusDto {
  status: OrderStatus
}
