import type { Order, OrderBill } from '@models/order.model.js'
import { calculateOrderTotal } from '@models/order.model.js'
import type { OrderRepository } from '@repositories/order.repository.js'
import type { PointsService } from '@services/points.service.js'
import { OrderAlreadyBilledError, OrderNotFoundError } from '@errors/DomainErrors.js'

// Flujo de "pedir la cuenta": calcula el importe, lo guarda en el pedido
// (una sola vez) y da los puntos de fidelización al cliente.
export class BillService {
    constructor(
        private readonly orderRepository: OrderRepository,
        private readonly pointsService: PointsService
    ) {}

    async requestBill(orderId: string, clientId: string): Promise<OrderBill> {
        const order = await this.orderRepository.findById(orderId)
        // Un pedido de otro cliente se trata como inexistente para no revelar que existe
        if (!order || !order.clientId || order.clientId !== clientId) {
            throw new OrderNotFoundError()
        }
        if (order.billedAt) {
            throw new OrderAlreadyBilledError()
        }

        const subtotal = calculateOrderTotal(order.items)
        const total = this.applyAdjustments(order, subtotal)
        const pointsEarned = await this.pointsService.calculatePointsFor(order.restaurantId, total)
        const billedAt = new Date()

        // El UPDATE es condicional (billed_at IS NULL): si dos peticiones llegan a la vez solo una cobra
        const billed = await this.orderRepository.markAsBilled(order.id, { total, pointsEarned, billedAt })
        if (!billed) {
            throw new OrderAlreadyBilledError()
        }

        const pointsBalance = await this.pointsService.addPoints(clientId, order.restaurantId, pointsEarned)

        return {
            orderId: order.id,
            restaurantId: order.restaurantId,
            clientId: order.clientId,
            subtotal,
            total,
            pointsEarned,
            pointsBalance,
            billedAt
        }
    }

    // Punto de extensión: aquí se aplicarán los descuentos (códigos, canje de puntos…)
    // sobre el subtotal. De momento el total es el subtotal. Los puntos se calculan
    // sobre el total ya ajustado (lo que el cliente paga de verdad).
    private applyAdjustments(_order: Order, subtotal: number): number {
        return subtotal
    }
}
