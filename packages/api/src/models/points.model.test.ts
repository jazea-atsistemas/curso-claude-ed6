import { describe, it, expect } from 'vitest'
import { calculatePointsEarned, type PointsRule } from './points.model.js'

const rule = (spendAmount: number, pointsAwarded: number): PointsRule => ({
    restaurantId: 'rest-1', spendAmount, pointsAwarded, updatedAt: '2026-10-22T10:00:00.000Z'
})

describe('calculatePointsEarned', () => {
    it('no da puntos si el restaurante no tiene regla', () => {
        expect(calculatePointsEarned(100, null)).toBe(0)
    })

    it('da Y puntos por cada X € completos gastados', () => {
        expect(calculatePointsEarned(34, rule(10, 1))).toBe(3)
        expect(calculatePointsEarned(34, rule(10, 5))).toBe(15)
    })

    it('no da puntos si no se llega a X €', () => {
        expect(calculatePointsEarned(9.99, rule(10, 1))).toBe(0)
    })

    it('cuenta el tramo exacto aunque haya decimales', () => {
        expect(calculatePointsEarned(0.3, rule(0.1, 1))).toBe(3)
        expect(calculatePointsEarned(20, rule(2.5, 2))).toBe(16)
    })

    it('no da puntos para un total de 0 o negativo', () => {
        expect(calculatePointsEarned(0, rule(10, 1))).toBe(0)
        expect(calculatePointsEarned(-5, rule(10, 1))).toBe(0)
    })
})
