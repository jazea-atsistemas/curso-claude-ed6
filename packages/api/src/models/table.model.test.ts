import { describe, it, expect } from 'vitest'
import { normalizeTableStatus } from './table.model.js'
import { InvalidTableStatusError } from '@errors/DomainErrors.js'

describe('normalizeTableStatus', () => {
    it('should accept all valid statuses', () => {
        for (const s of ['libre', 'ocupada', 'reservada']) {
            expect(normalizeTableStatus(s)).toBe(s)
        }
    })

    it('should normalize case and surrounding spaces', () => {
        expect(normalizeTableStatus('  OCUPADA ')).toBe('ocupada')
        expect(normalizeTableStatus('Reservada')).toBe('reservada')
    })

    it('should throw InvalidTableStatusError for unknown status', () => {
        expect(() => normalizeTableStatus('rota')).toThrow(InvalidTableStatusError)
    })

    it('should throw InvalidTableStatusError for empty or missing status', () => {
        expect(() => normalizeTableStatus('')).toThrow(InvalidTableStatusError)
        expect(() => normalizeTableStatus('   ')).toThrow(InvalidTableStatusError)
        expect(() => normalizeTableStatus(undefined as unknown as string)).toThrow(InvalidTableStatusError)
    })
})
