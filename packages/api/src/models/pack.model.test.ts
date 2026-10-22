import { describe, it, expect } from 'vitest'
import { normalizePackRestriction, isDishAllowedInSlot, allowedDishesForSlot, type PackSlot } from './pack.model.js'
import { InvalidPackRestrictionError } from '@errors/DomainErrors.js'

const slot = (overrides: Partial<PackSlot> = {}): PackSlot => ({
    id: 'slot-1',
    name: 'Bebida',
    category: 'bebida',
    restriction: 'bloquear',
    dishIds: [],
    ...overrides
})

const agua = { id: 'agua', category: 'bebida' as const, available: true }
const cerveza = { id: 'cerveza', category: 'bebida' as const, available: true }
const zumo = { id: 'zumo', category: 'bebida' as const, available: false }
const pizza = { id: 'pizza', category: 'principal' as const, available: true }

describe('normalizePackRestriction', () => {
    it('should accept bloquear and permitir, ignoring case and spaces', () => {
        expect(normalizePackRestriction(' Bloquear ')).toBe('bloquear')
        expect(normalizePackRestriction('PERMITIR')).toBe('permitir')
    })

    it('should throw InvalidPackRestrictionError for unknown or missing values', () => {
        expect(() => normalizePackRestriction('todos')).toThrow(InvalidPackRestrictionError)
        expect(() => normalizePackRestriction(undefined as any)).toThrow(InvalidPackRestrictionError)
    })
})

describe('isDishAllowedInSlot', () => {
    it('should allow any available dish of the category when nothing is blocked', () => {
        expect(isDishAllowedInSlot(slot(), agua)).toBe(true)
        expect(isDishAllowedInSlot(slot(), cerveza)).toBe(true)
    })

    it('should reject dishes of another category', () => {
        expect(isDishAllowedInSlot(slot(), pizza)).toBe(false)
    })

    it('should reject unavailable dishes', () => {
        expect(isDishAllowedInSlot(slot(), zumo)).toBe(false)
    })

    it('should reject blocked dishes in bloquear mode', () => {
        const s = slot({ dishIds: ['cerveza'] })
        expect(isDishAllowedInSlot(s, cerveza)).toBe(false)
        expect(isDishAllowedInSlot(s, agua)).toBe(true)
    })

    it('should only accept listed dishes in permitir mode', () => {
        const s = slot({ restriction: 'permitir', dishIds: ['agua'] })
        expect(isDishAllowedInSlot(s, agua)).toBe(true)
        expect(isDishAllowedInSlot(s, cerveza)).toBe(false)
    })
})

describe('allowedDishesForSlot', () => {
    it('should filter the dish list keeping the original order', () => {
        const s = slot({ dishIds: ['cerveza'] })
        expect(allowedDishesForSlot(s, [pizza, agua, cerveza, zumo])).toEqual([agua])
    })
})
