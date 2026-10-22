import { describe, it, expect } from 'vitest'
import { calculateOrderItemsTotal, type OrderItem } from './order.model.js'

const item = (overrides: Partial<OrderItem> = {}): OrderItem => ({
    id: 'i',
    dishId: 'd',
    quantity: 1,
    notes: null,
    status: 'pendiente',
    dishPrice: 10,
    ...overrides
})

const packItem = (packLineId: string, dishPrice: number, packPrice = 20): OrderItem =>
    item({ packId: 'pack-1', packLineId, packName: 'Menú', packPrice, dishPrice })

describe('calculateOrderItemsTotal', () => {
    it('should return 0 for an empty order', () => {
        expect(calculateOrderItemsTotal([])).toBe(0)
    })

    it('should sum dish price × quantity for loose dishes', () => {
        expect(calculateOrderItemsTotal([item({ dishPrice: 12.5 }), item({ dishPrice: 2, quantity: 2 })])).toBe(16.5)
    })

    it('should count the pack price once per pack line, ignoring its dish prices', () => {
        const items = [packItem('line-1', 9), packItem('line-1', 12.5), packItem('line-1', 2.5)]
        expect(calculateOrderItemsTotal(items)).toBe(20)
    })

    it('should count each pack line separately and add the loose dishes', () => {
        const items = [
            packItem('line-1', 9), packItem('line-1', 2.5),
            packItem('line-2', 9, 18.9), packItem('line-2', 2.5, 18.9),
            item({ dishPrice: 0.1 }), item({ dishPrice: 0.2 })
        ]
        expect(calculateOrderItemsTotal(items)).toBe(39.2)
    })

    it('should treat a missing price as 0', () => {
        expect(calculateOrderItemsTotal([item({ dishPrice: undefined as any }), item({ packLineId: 'l', packPrice: null })])).toBe(0)
    })
})
