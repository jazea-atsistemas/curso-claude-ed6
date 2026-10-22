import { describe, it, expect, beforeEach } from 'vitest'
import { BillService } from './bill.service.js'
import { PointsService } from './points.service.js'
import { MockOrderRepository } from '@repositories/mocks/MockOrderRepository.js'
import { MockPointsRepository } from '@repositories/mocks/MockPointsRepository.js'
import { MockRestaurantRepository } from '@repositories/mocks/MockRestaurantRepository.js'
import type { Order, OrderItem } from '@models/order.model.js'
import { OrderAlreadyBilledError, OrderNotFoundError } from '@errors/DomainErrors.js'

const now = '2026-10-22T10:00:00.000Z'

const item = (id: string, dishPrice: number): OrderItem => ({
    id, dishId: 'dish', quantity: 1, notes: null, status: 'entregado', dishPrice
})

const buildOrder = (id: string, clientId: string | null, items: OrderItem[]): Order => ({
    id, restaurantId: 'rest-1', tableId: null, clientId, createdAt: new Date(now), items
})

describe('BillService.requestBill', () => {
    let orderRepo: MockOrderRepository
    let pointsRepo: MockPointsRepository
    let service: BillService

    beforeEach(async () => {
        orderRepo = new MockOrderRepository()
        pointsRepo = new MockPointsRepository()
        service = new BillService(orderRepo, new PointsService(pointsRepo, new MockRestaurantRepository()))

        await pointsRepo.saveRule({ restaurantId: 'rest-1', spendAmount: 10, pointsAwarded: 1, updatedAt: now })
        // 2 x 12,50 + 9 = 34 €
        await orderRepo.create(buildOrder('order-1', 'client-1', [item('a', 12.5), item('b', 12.5), item('c', 9)]))
    })

    it('calcula el total, lo guarda y da los puntos al cliente', async () => {
        const bill = await service.requestBill('order-1', 'client-1')

        expect(bill).toMatchObject({
            orderId: 'order-1',
            restaurantId: 'rest-1',
            clientId: 'client-1',
            subtotal: 34,
            total: 34,
            pointsEarned: 3,
            pointsBalance: 3
        })
        expect(bill.billedAt).toBeInstanceOf(Date)

        const stored = await orderRepo.findById('order-1')
        expect(stored).toMatchObject({ total: 34, pointsEarned: 3, billedAt: bill.billedAt })
        expect((await pointsRepo.findBalance('client-1', 'rest-1'))?.balance).toBe(3)
    })

    it('acumula los puntos de varios pedidos', async () => {
        await orderRepo.create(buildOrder('order-2', 'client-1', [item('d', 20)]))
        await service.requestBill('order-1', 'client-1')
        const bill = await service.requestBill('order-2', 'client-1')
        expect(bill).toMatchObject({ pointsEarned: 2, pointsBalance: 5 })
    })

    it('no da puntos si el restaurante no tiene regla', async () => {
        await pointsRepo.deleteRule('rest-1')
        const bill = await service.requestBill('order-1', 'client-1')
        expect(bill).toMatchObject({ total: 34, pointsEarned: 0, pointsBalance: 0 })
    })

    it('rechaza pedir la cuenta dos veces sin volver a dar puntos', async () => {
        await service.requestBill('order-1', 'client-1')
        await expect(service.requestBill('order-1', 'client-1')).rejects.toThrow(OrderAlreadyBilledError)
        expect((await pointsRepo.findBalance('client-1', 'rest-1'))?.balance).toBe(3)
    })

    it('lanza OrderNotFoundError si el pedido no existe', async () => {
        await expect(service.requestBill('nope', 'client-1')).rejects.toThrow(OrderNotFoundError)
    })

    it('lanza OrderNotFoundError si el pedido es de otro cliente', async () => {
        await expect(service.requestBill('order-1', 'client-2')).rejects.toThrow(OrderNotFoundError)
        expect((await orderRepo.findById('order-1'))?.billedAt).toBeUndefined()
    })

    it('lanza OrderNotFoundError si el pedido no tiene cliente', async () => {
        await orderRepo.create(buildOrder('order-anon', null, [item('x', 10)]))
        await expect(service.requestBill('order-anon', 'client-1')).rejects.toThrow(OrderNotFoundError)
    })
})
