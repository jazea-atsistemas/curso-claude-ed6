import { describe, it, expect, beforeEach } from 'vitest'
import { OrderService } from './order.service.js'
import { MockOrderRepository } from '@repositories/mocks/MockOrderRepository.js'
import { MockTableRepository } from '@repositories/mocks/MockTableRepository.js'
import type { Order } from '@models/order.model.js'
import { OrderNotFoundError, InvalidOrderStatusError, TableNotFoundError, TableNotAvailableError } from '@errors/DomainErrors.js'

describe('OrderService.updateItemStatus', () => {
    let repo: MockOrderRepository
    let service: OrderService
    let testOrder: Order

    beforeEach(async () => {
        repo = new MockOrderRepository()
        service = new OrderService(repo, new MockTableRepository())

        testOrder = {
            id: 'order-1',
            restaurantId: 'rest-1',
            tableId: null,
            clientId: null,
            createdAt: new Date(),
            items: [
                { id: 'item-1', dishId: 'dish-1', quantity: 1, notes: null, status: 'pendiente' }
            ]
        }
        await repo.create(testOrder)
    })

    it('should update the status of an item successfully', async () => {
        await service.updateItemStatus('order-1', 'item-1', 'preparando')
        const updatedItem = testOrder.items[0]!
        expect(updatedItem.status).toBe('preparando')
    })

    it('should throw an error if the order does not exist', async () => {
        await expect(service.updateItemStatus('order-bad', 'item-1', 'preparando'))
            .rejects.toThrow(OrderNotFoundError)
    })

    it('should throw an error if the item does not exist inside the order', async () => {
        await expect(service.updateItemStatus('order-1', 'item-bad', 'preparando'))
            .rejects.toThrow(OrderNotFoundError)
    })

    it('should throw DomainError if status is invalid', async () => {
        await expect(service.updateItemStatus('order-1', 'item-1', 'invalid-status'))
            .rejects.toThrow(InvalidOrderStatusError)
    })
})

describe('OrderService.create con mesa', () => {
    const now = '2026-10-22T10:00:00.000Z'
    let repo: MockOrderRepository
    let tableRepo: MockTableRepository
    let service: OrderService

    const request = (tableId: string | null) => ({
        restaurantId: 'rest-1',
        tableId,
        clientId: 'client-1',
        items: [{ dishId: 'dish-1', quantity: 2, notes: null }]
    })

    beforeEach(async () => {
        repo = new MockOrderRepository()
        tableRepo = new MockTableRepository()
        service = new OrderService(repo, tableRepo)

        const base = { description: null, capacity: 4, createdAt: now, updatedAt: now }
        await tableRepo.save({ ...base, id: 'rest-1-mesa-5', restaurantId: 'rest-1', number: 5, status: 'ocupada' })
        await tableRepo.save({ ...base, id: 'rest-1-mesa-1', restaurantId: 'rest-1', number: 1, status: 'libre' })
        await tableRepo.save({ ...base, id: 'rest-1-mesa-6', restaurantId: 'rest-1', number: 6, status: 'reservada' })
        await tableRepo.save({ ...base, id: 'rest-2-mesa-1', restaurantId: 'rest-2', number: 1, status: 'ocupada' })
    })

    it('should create the order without table when tableId is null', async () => {
        const order = await service.create(request(null))
        expect(order.tableId).toBeNull()
        expect(order.tableNumber).toBeNull()
        expect(order.items).toHaveLength(2)
        expect(repo.orders).toHaveLength(1)
    })

    it('should create the order with an occupied table of the restaurant and return its number', async () => {
        const order = await service.create(request('rest-1-mesa-5'))
        expect(order.tableId).toBe('rest-1-mesa-5')
        expect(order.tableNumber).toBe(5)
        expect(repo.orders).toHaveLength(1)
    })

    it('should throw TableNotFoundError for a missing table', async () => {
        await expect(service.create(request('nope'))).rejects.toThrow(TableNotFoundError)
        expect(repo.orders).toHaveLength(0)
    })

    it('should throw TableNotFoundError for a table of another restaurant', async () => {
        await expect(service.create(request('rest-2-mesa-1'))).rejects.toThrow(TableNotFoundError)
    })

    it('should throw TableNotAvailableError for a free or reserved table', async () => {
        await expect(service.create(request('rest-1-mesa-1'))).rejects.toThrow(TableNotAvailableError)
        await expect(service.create(request('rest-1-mesa-6'))).rejects.toThrow(TableNotAvailableError)
        expect(repo.orders).toHaveLength(0)
    })
})
