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
    // Se rellenan al pedir la cuenta; null mientras el pedido no está cobrado
    total?: number | null
    pointsEarned?: number | null
    billedAt?: Date | null
}

// Resultado de pedir la cuenta de un pedido
export interface OrderBill {
    orderId: string
    restaurantId: string
    clientId: string | null
    subtotal: number
    total: number
    pointsEarned: number
    pointsBalance: number | null
    billedAt: Date
}

// Importe del pedido a partir de sus ítems. Los ítems vienen expandidos a
// cantidad 1, pero se multiplica por quantity por si acaso. Se suma en
// céntimos para no arrastrar errores de coma flotante (0.1 + 0.2).
export function calculateOrderTotal(items: OrderItem[]): number {
    const cents = items.reduce((sum, item) => sum + Math.round((item.dishPrice ?? 0) * 100) * item.quantity, 0)
    return cents / 100
}

export function normalizeOrderStatus(value: string): OrderStatusType {
    const normalized = value.toLowerCase().trim()
    if (!VALID_ORDER_STATUSES.includes(normalized as OrderStatusType)) {
        throw new InvalidOrderStatusError(`Estado inválido: ${value}. Debe ser uno de: ${VALID_ORDER_STATUSES.join(', ')}`)
    }
    return normalized as OrderStatusType
}

export function isOrderFullyDelivered(order: Order): boolean {
    return order.items.length > 0 && order.items.every(item => item.status === 'entregado')
}
