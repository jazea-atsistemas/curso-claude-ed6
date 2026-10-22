import { randomUUID } from 'crypto'
import type { Order, OrderItem } from '@models/order.model.js'
import { normalizeOrderStatus } from '@models/order.model.js'
import type { OrderRepository } from '@repositories/order.repository.js'
import type { TableRepository } from '@repositories/table.repository.js'
import type { PackSelection, PackSelectionResolver } from '@services/pack.service.js'
import { RestaurantIdRequiredError, OrderNotFoundError, TableNotFoundError, TableNotAvailableError, InvalidPackSelectionError } from '@errors/DomainErrors.js'

export interface CreateOrderPackRequest {
    packId: string
    quantity?: number
    notes?: string | null
    selections: PackSelection[]
}

export interface CreateOrderRequest {
    restaurantId: string
    tableId: string | null
    clientId: string | null
    items: {
        dishId: string
        quantity: number
        notes: string | null
    }[]
    packs?: CreateOrderPackRequest[]
}

export class OrderService {
    constructor(
        private readonly orderRepository: OrderRepository,
        private readonly tableRepository: TableRepository,
        // Opcional para no obligar a los tests de pedidos sin packs a montarlo
        private readonly packResolver?: PackSelectionResolver
    ) {}

    async create(request: CreateOrderRequest): Promise<Order> {
        if (!request.restaurantId || request.restaurantId.trim() === '') {
            throw new RestaurantIdRequiredError()
        }

        const tableNumber = await this.resolveTableNumber(request.restaurantId, request.tableId)

        const items: OrderItem[] = []
        for (const item of request.items ?? []) {
            for (let i = 0; i < item.quantity; i++) {
                items.push({
                    id: randomUUID(),
                    dishId: item.dishId,
                    quantity: 1,
                    notes: item.notes,
                    status: 'pendiente',
                    packId: null,
                    packLineId: null,
                    packName: null,
                    packPrice: null
                })
            }
        }
        items.push(...await this.buildPackItems(request.restaurantId, request.packs ?? []))

        const order: Order = {
            id: randomUUID(),
            restaurantId: request.restaurantId,
            tableId: request.tableId,
            tableNumber,
            clientId: request.clientId,
            createdAt: new Date(),
            items
        }

        await this.orderRepository.create(order)

        return order
    }

    // Cada unidad de un pack es una línea (packLineId) con una fila por plato elegido,
    // así cocina y barra siguen viendo platos sueltos con su propio estado.
    private async buildPackItems(restaurantId: string, packs: CreateOrderPackRequest[]): Promise<OrderItem[]> {
        if (packs.length === 0) return []
        if (!this.packResolver) {
            throw new InvalidPackSelectionError('Este servicio no admite packs')
        }

        const items: OrderItem[] = []
        for (const request of packs) {
            const quantity = request.quantity ?? 1
            if (!Number.isInteger(quantity) || quantity < 1) {
                throw new InvalidPackSelectionError('La cantidad de un pack debe ser un entero >= 1')
            }
            const { pack, dishIds } = await this.packResolver.resolveSelection(restaurantId, request.packId, request.selections)
            for (let i = 0; i < quantity; i++) {
                const packLineId = randomUUID()
                for (const dishId of dishIds) {
                    items.push({
                        id: randomUUID(),
                        dishId,
                        quantity: 1,
                        notes: request.notes ?? null,
                        status: 'pendiente',
                        packId: pack.id,
                        packLineId,
                        packName: pack.name,
                        packPrice: pack.price
                    })
                }
            }
        }
        return items
    }

    // Un pedido con mesa solo se acepta si la mesa es del restaurante y está ocupada
    private async resolveTableNumber(restaurantId: string, tableId: string | null): Promise<number | null> {
        if (tableId === null) return null

        const table = await this.tableRepository.findById(tableId, restaurantId)
        if (!table) {
            throw new TableNotFoundError()
        }
        if (table.status !== 'ocupada') {
            throw new TableNotAvailableError()
        }
        return table.number
    }

    async listActive(restaurantId: string): Promise<Order[]> {
        return this.orderRepository.findActiveByRestaurant(restaurantId)
    }

    async getById(orderId: string): Promise<Order> {
        const order = await this.orderRepository.findById(orderId)
        if (!order) {
            throw new OrderNotFoundError()
        }
        return order
    }

    async getByClientId(clientId: string): Promise<Order[]> {
        return this.orderRepository.findByClientId(clientId)
    }

    async updateItemStatus(orderId: string, itemId: string, status: string): Promise<void> {
        const order = await this.orderRepository.findById(orderId)
        if (!order) {
            throw new OrderNotFoundError()
        }

        const item = order.items.find(i => i.id === itemId)
        if (!item) {
            throw new OrderNotFoundError() // Or ItemNotFoundError
        }

        const normalizedStatus = normalizeOrderStatus(status)
        item.status = normalizedStatus

        await this.orderRepository.updateItemStatus(orderId, itemId, normalizedStatus)
    }
}
