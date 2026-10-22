import { describe, it, expect } from 'vitest'
import { calculateOrderTotal, type OrderItem } from './order.model.js'

const item = (dishPrice: number | undefined, quantity = 1): OrderItem => ({
    id: 'i', dishId: 'd', quantity, notes: null, status: 'pendiente', ...(dishPrice === undefined ? {} : { dishPrice })
})

describe('calculateOrderTotal', () => {
    it('devuelve 0 para un pedido sin ítems', () => {
        expect(calculateOrderTotal([])).toBe(0)
    })

    it('suma el precio de cada ítem (los ítems vienen expandidos a cantidad 1)', () => {
        expect(calculateOrderTotal([item(12.5), item(12.5), item(9)])).toBe(34)
    })

    it('multiplica por la cantidad si un ítem tiene más de 1', () => {
        expect(calculateOrderTotal([item(2, 2), item(7.5)])).toBe(11.5)
    })

    it('redondea a céntimos evitando errores de coma flotante', () => {
        expect(calculateOrderTotal([item(0.1), item(0.2)])).toBe(0.3)
        expect(calculateOrderTotal([item(2.5), item(2.5), item(2.5)])).toBe(7.5)
    })

    it('cuenta como 0 un ítem sin precio conocido', () => {
        expect(calculateOrderTotal([item(undefined), item(3)])).toBe(3)
    })
})
