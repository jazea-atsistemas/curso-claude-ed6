import { describe, it, expect, beforeEach } from 'vitest'
import { OrderService } from './order.service.js'
import { PackService } from './pack.service.js'
import { MockOrderRepository } from '@repositories/mocks/MockOrderRepository.js'
import { MockTableRepository } from '@repositories/mocks/MockTableRepository.js'
import { MockPackRepository } from '@repositories/mocks/MockPackRepository.js'
import { MockDishRepository } from '@repositories/mocks/MockDishRepository.js'
import { MockRestaurantRepository } from '@repositories/mocks/MockRestaurantRepository.js'
import type { DishCategoryType } from '@models/dish.model.js'
import type { Pack } from '@models/pack.model.js'
import { calculateOrderItemsTotal } from '@models/order.model.js'
import { InvalidPackSelectionError, PackNotFoundError, PackNotActiveError } from '@errors/DomainErrors.js'

const now = '2026-10-22T10:00:00.000Z'

describe('OrderService.create con packs', () => {
    let orderRepo: MockOrderRepository
    let dishRepo: MockDishRepository
    let packService: PackService
    let service: OrderService
    let pack: Pack

    beforeEach(async () => {
        orderRepo = new MockOrderRepository()
        dishRepo = new MockDishRepository()
        const restaurantRepo = new MockRestaurantRepository()
        packService = new PackService(new MockPackRepository(), dishRepo, restaurantRepo)
        service = new OrderService(orderRepo, new MockTableRepository(), packService)

        await restaurantRepo.save({
            id: 'rest-1', name: 'Rest', address: 'Calle 1', email: 'r@test.com', phone: '600000000',
            ownerFirstName: 'Ana', ownerLastName: 'Pérez', logoUrl: null, createdAt: now, updatedAt: now
        })
        const dishes: [string, DishCategoryType, number][] = [['ensalada', 'entrante', 9], ['pizza', 'principal', 12.5], ['agua', 'bebida', 2], ['cerveza', 'bebida', 3]]
        for (const [id, category, price] of dishes) {
            await dishRepo.save({
                id, name: id, description: null, price, category, available: true, restaurantId: 'rest-1',
                ingredients: [], createdAt: now, updatedAt: now
            })
        }
        pack = await packService.create('rest-1', {
            name: 'Menú del día',
            price: 20,
            slots: [
                { category: 'entrante' },
                { category: 'principal' },
                { category: 'bebida', restriction: 'bloquear', dishIds: ['cerveza'] }
            ]
        })
    })

    const selections = (bebida = 'agua') => [
        { slotId: pack.slots[0]!.id, dishId: 'ensalada' },
        { slotId: pack.slots[1]!.id, dishId: 'pizza' },
        { slotId: pack.slots[2]!.id, dishId: bebida }
    ]

    const request = (packs: any[], items: any[] = []) => ({ restaurantId: 'rest-1', tableId: null, clientId: 'client-1', items, packs })

    it('should store one pending item per chosen dish, linked to the pack line', async () => {
        const order = await service.create(request([{ packId: pack.id, selections: selections(), notes: 'Sin sal' }]))

        expect(order.items.map(i => i.dishId)).toEqual(['ensalada', 'pizza', 'agua'])
        for (const item of order.items) {
            expect(item).toMatchObject({ quantity: 1, status: 'pendiente', notes: 'Sin sal', packId: pack.id, packName: 'Menú del día', packPrice: 20 })
        }
        expect(new Set(order.items.map(i => i.packLineId)).size).toBe(1)
        expect(order.items[0]!.packLineId).toBeTruthy()
        expect(orderRepo.orders).toHaveLength(1)
    })

    it('should create one pack line per unit and mix with loose dishes', async () => {
        const order = await service.create(request(
            [{ packId: pack.id, quantity: 2, selections: selections() }],
            [{ dishId: 'cerveza', quantity: 1, notes: null }]
        ))

        const loose = order.items.filter(i => i.packLineId === null)
        expect(loose).toHaveLength(1)
        expect(loose[0]).toMatchObject({ dishId: 'cerveza', packId: null, packName: null, packPrice: null })
        expect(new Set(order.items.filter(i => i.packLineId).map(i => i.packLineId)).size).toBe(2)
        expect(order.items).toHaveLength(7)

        const priced = order.items.map(i => ({ ...i, dishPrice: i.dishId === 'cerveza' ? 3 : 99 }))
        expect(calculateOrderItemsTotal(priced)).toBe(43)
    })

    it('should reject a blocked dish without creating the order', async () => {
        await expect(service.create(request([{ packId: pack.id, selections: selections('cerveza') }]))).rejects.toThrow(InvalidPackSelectionError)
        expect(orderRepo.orders).toHaveLength(0)
    })

    it('should reject an unknown or inactive pack', async () => {
        await expect(service.create(request([{ packId: 'nope', selections: selections() }]))).rejects.toThrow(PackNotFoundError)
        await packService.update(pack.id, 'rest-1', { name: pack.name, price: 20, active: false, slots: [{ category: 'bebida' }] })
        await expect(service.create(request([{ packId: pack.id, selections: selections() }]))).rejects.toThrow(PackNotActiveError)
    })

    it('should reject an invalid pack quantity', async () => {
        for (const quantity of [0, -1, 1.5]) {
            await expect(service.create(request([{ packId: pack.id, quantity, selections: selections() }]))).rejects.toThrow(InvalidPackSelectionError)
        }
    })

    it('should reject packs when the service has no pack resolver', async () => {
        const withoutPacks = new OrderService(orderRepo, new MockTableRepository())
        await expect(withoutPacks.create(request([{ packId: pack.id, selections: selections() }]))).rejects.toThrow(InvalidPackSelectionError)
    })
})
