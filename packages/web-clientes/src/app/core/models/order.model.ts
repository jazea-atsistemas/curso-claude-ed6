export interface OrderItem {
  id: string
  dishId: string
  quantity: number
  notes: string | null
  status: string
  dishName?: string
  dishPrice?: number
  // Packs: los platos de un mismo pack comparten packLineId (null en un plato suelto)
  packId?: string | null
  packLineId?: string | null
  packName?: string | null
  packPrice?: number | null
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
}

/** Importe del pedido: cada pack cuenta su precio una vez (no el de sus platos). */
export function orderItemsTotal(items: OrderItem[]): number {
  const packLines = new Set<string>()
  let total = 0
  for (const item of items) {
    if (item.packLineId) {
      if (!packLines.has(item.packLineId)) {
        packLines.add(item.packLineId)
        total += item.packPrice || 0
      }
    } else {
      total += (item.dishPrice || 0) * item.quantity
    }
  }
  return total
}
