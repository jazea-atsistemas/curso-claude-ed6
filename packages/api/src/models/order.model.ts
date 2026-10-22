import { InvalidOrderStatusError } from '@errors/DomainErrors.js'

const VALID_ORDER_STATUSES = ['pendiente', 'preparando', 'listo', 'entregado'] as const

export type OrderStatusType = typeof VALID_ORDER_STATUSES[number]

export interface OrderItem {
    id: string
    dishId: string
    quantity: number
    notes: string | null
    status: OrderStatusType
    dishName?: string
    dishPrice?: number
    dishCategory?: string
    // Packs (#9): los platos de un mismo pack comparten packLineId. El nombre y el
    // precio del pack se copian al pedir. En un plato suelto los cuatro son null.
    packId?: string | null
    packLineId?: string | null
    packName?: string | null
    packPrice?: number | null
}

export interface Order {
    id: string
    restaurantId: string
    tableId: string | null
    tableNumber?: number | null
    clientId: string | null
    createdAt: Date
    items: OrderItem[]
    restaurantName?: string
    restaurantLogoUrl?: string | null
}

export function normalizeOrderStatus(value: string): OrderStatusType {
    const normalized = value.toLowerCase().trim()
    if (!VALID_ORDER_STATUSES.includes(normalized as OrderStatusType)) {
        throw new InvalidOrderStatusError(`Estado inválido: ${value}. Debe ser uno de: ${VALID_ORDER_STATUSES.join(', ')}`)
    }
    return normalized as OrderStatusType
}

// Importe de las líneas de un pedido teniendo en cuenta los packs: un plato suelto
// cuenta su precio (dishPrice × quantity) y cada línea de pack cuenta el precio
// del pack una sola vez, sin sumar el precio de los platos que incluye.
export function calculateOrderItemsTotal(items: OrderItem[]): number {
    let totalCents = 0
    const countedPackLines = new Set<string>()
    for (const item of items) {
        if (item.packLineId) {
            if (!countedPackLines.has(item.packLineId)) {
                countedPackLines.add(item.packLineId)
                totalCents += Math.round((item.packPrice ?? 0) * 100)
            }
        } else {
            totalCents += Math.round((item.dishPrice ?? 0) * 100) * item.quantity
        }
    }
    return totalCents / 100
}

export function isOrderFullyDelivered(order: Order): boolean {
    return order.items.length > 0 && order.items.every(item => item.status === 'entregado')
}
