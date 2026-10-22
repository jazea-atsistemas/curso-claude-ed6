import { describe, it, expect, beforeEach } from 'vitest'
import { TableService } from './table.service.js'
import { MockTableRepository } from '@repositories/mocks/MockTableRepository.js'
import { MockRestaurantRepository } from '@repositories/mocks/MockRestaurantRepository.js'
import {
    TableNotFoundError,
    TableNumberRequiredError,
    InvalidCapacityError,
    InvalidTableStatusError,
    DuplicatedTableNumberError,
    TableNotAvailableError,
    TableOccupiedError,
    InvalidPeopleCountError,
    RestaurantNotFoundError
} from '@errors/DomainErrors.js'

const now = '2026-10-22T10:00:00.000Z'

describe('TableService', () => {
    let tableRepo: MockTableRepository
    let restaurantRepo: MockRestaurantRepository
    let service: TableService

    beforeEach(async () => {
        tableRepo = new MockTableRepository()
        restaurantRepo = new MockRestaurantRepository()
        service = new TableService(tableRepo, restaurantRepo)

        for (const id of ['rest-1', 'rest-2']) {
            await restaurantRepo.save({
                id,
                name: `Rest ${id}`,
                address: 'Calle 1',
                email: `${id}@test.com`,
                phone: '600000000',
                ownerFirstName: 'Ana',
                ownerLastName: 'Pérez',
                logoUrl: null,
                createdAt: now,
                updatedAt: now
            })
        }
    })

    describe('create', () => {
        it('should create a table with status libre by default', async () => {
            const table = await service.create('rest-1', { number: 1, capacity: 4 })
            expect(table).toMatchObject({ restaurantId: 'rest-1', number: 1, capacity: 4, status: 'libre', description: null })
            expect(table.id).toBeTruthy()
            expect(table.createdAt).toBe(table.updatedAt)
            expect(await tableRepo.findById(table.id, 'rest-1')).toEqual(table)
        })

        it('should accept description and a normalized status', async () => {
            const table = await service.create('rest-1', { number: 2, capacity: 2, description: '  Terraza ', status: ' Reservada' })
            expect(table.description).toBe('Terraza')
            expect(table.status).toBe('reservada')
        })

        it('should store an empty description as null', async () => {
            const table = await service.create('rest-1', { number: 3, capacity: 2, description: '   ' })
            expect(table.description).toBeNull()
        })

        it('should throw RestaurantNotFoundError if the restaurant does not exist, before validating the body', async () => {
            await expect(service.create('rest-x', { number: 0, capacity: 0 })).rejects.toThrow(RestaurantNotFoundError)
        })

        it('should reject a missing, non integer or < 1 number', async () => {
            for (const number of [undefined, 0, -1, 1.5, '4']) {
                await expect(service.create('rest-1', { number: number as any, capacity: 4 })).rejects.toThrow(TableNumberRequiredError)
            }
        })

        it('should reject a missing, non integer or < 1 capacity', async () => {
            for (const capacity of [undefined, 0, 2.5, '4']) {
                await expect(service.create('rest-1', { number: 1, capacity: capacity as any })).rejects.toThrow(InvalidCapacityError)
            }
        })

        it('should reject an unknown status', async () => {
            await expect(service.create('rest-1', { number: 1, capacity: 4, status: 'rota' })).rejects.toThrow(InvalidTableStatusError)
        })

        it('should reject a duplicated number in the same restaurant', async () => {
            await service.create('rest-1', { number: 7, capacity: 4 })
            await expect(service.create('rest-1', { number: 7, capacity: 2 })).rejects.toThrow(DuplicatedTableNumberError)
        })

        it('should allow the same number in another restaurant', async () => {
            await service.create('rest-1', { number: 7, capacity: 4 })
            await expect(service.create('rest-2', { number: 7, capacity: 4 })).resolves.toMatchObject({ number: 7 })
        })
    })

    describe('update', () => {
        it('should replace the editable fields and keep id, restaurant and createdAt', async () => {
            const created = await service.create('rest-1', { number: 1, capacity: 4, description: 'Vieja' })
            const updated = await service.update(created.id, 'rest-1', { number: 10, capacity: 6, status: 'ocupada' })
            expect(updated).toMatchObject({ id: created.id, restaurantId: 'rest-1', number: 10, capacity: 6, status: 'ocupada', description: null, createdAt: created.createdAt })
        })

        it('should allow keeping its own number', async () => {
            const created = await service.create('rest-1', { number: 1, capacity: 4 })
            await expect(service.update(created.id, 'rest-1', { number: 1, capacity: 5, status: 'libre' })).resolves.toMatchObject({ capacity: 5 })
        })

        it('should reject a number used by another table', async () => {
            await service.create('rest-1', { number: 1, capacity: 4 })
            const other = await service.create('rest-1', { number: 2, capacity: 4 })
            await expect(service.update(other.id, 'rest-1', { number: 1, capacity: 4, status: 'libre' })).rejects.toThrow(DuplicatedTableNumberError)
        })

        it('should require status', async () => {
            const created = await service.create('rest-1', { number: 1, capacity: 4 })
            await expect(service.update(created.id, 'rest-1', { number: 1, capacity: 4 } as any)).rejects.toThrow(InvalidTableStatusError)
        })

        it('should throw TableNotFoundError for a missing table or one of another restaurant', async () => {
            const created = await service.create('rest-1', { number: 1, capacity: 4 })
            await expect(service.update('nope', 'rest-1', { number: 1, capacity: 4, status: 'libre' })).rejects.toThrow(TableNotFoundError)
            await expect(service.update(created.id, 'rest-2', { number: 1, capacity: 4, status: 'libre' })).rejects.toThrow(TableNotFoundError)
        })
    })

    describe('delete', () => {
        it('should delete a free or reserved table', async () => {
            const free = await service.create('rest-1', { number: 1, capacity: 4 })
            const reserved = await service.create('rest-1', { number: 2, capacity: 4, status: 'reservada' })
            await service.delete(free.id, 'rest-1')
            await service.delete(reserved.id, 'rest-1')
            expect(await tableRepo.findByRestaurantId('rest-1')).toEqual([])
        })

        it('should throw TableOccupiedError for an occupied table', async () => {
            const table = await service.create('rest-1', { number: 1, capacity: 4, status: 'ocupada' })
            await expect(service.delete(table.id, 'rest-1')).rejects.toThrow(TableOccupiedError)
        })

        it('should throw TableNotFoundError for a missing table or one of another restaurant', async () => {
            const table = await service.create('rest-1', { number: 1, capacity: 4 })
            await expect(service.delete('nope', 'rest-1')).rejects.toThrow(TableNotFoundError)
            await expect(service.delete(table.id, 'rest-2')).rejects.toThrow(TableNotFoundError)
        })
    })

    describe('getById / findByRestaurantId', () => {
        it('should return the table of the restaurant', async () => {
            const table = await service.create('rest-1', { number: 1, capacity: 4 })
            expect(await service.getById(table.id, 'rest-1')).toEqual(table)
        })

        it('should throw TableNotFoundError for a table of another restaurant', async () => {
            const table = await service.create('rest-1', { number: 1, capacity: 4 })
            await expect(service.getById(table.id, 'rest-2')).rejects.toThrow(TableNotFoundError)
        })

        it('should list tables ordered by number', async () => {
            await service.create('rest-1', { number: 3, capacity: 4 })
            await service.create('rest-1', { number: 1, capacity: 4 })
            const tables = await service.findByRestaurantId('rest-1')
            expect(tables.map(t => t.number)).toEqual([1, 3])
        })
    })

    describe('listAvailable', () => {
        it('should return free tables with enough capacity', async () => {
            await service.create('rest-1', { number: 1, capacity: 2 })
            await service.create('rest-1', { number: 2, capacity: 4 })
            await service.create('rest-1', { number: 3, capacity: 6, status: 'ocupada' })
            await service.create('rest-1', { number: 4, capacity: 8, status: 'reservada' })
            const tables = await service.listAvailable('rest-1', 3)
            expect(tables.map(t => t.number)).toEqual([2])
        })

        it('should reject an invalid people count', async () => {
            for (const people of [0, -2, 1.5, NaN, undefined]) {
                await expect(service.listAvailable('rest-1', people as any)).rejects.toThrow(InvalidPeopleCountError)
            }
        })
    })

    describe('occupy', () => {
        it('should occupy a free table and return it as ocupada', async () => {
            const table = await service.create('rest-1', { number: 1, capacity: 4 })
            const occupied = await service.occupy(table.id, 'rest-1', 4)
            expect(occupied.status).toBe('ocupada')
            expect((await tableRepo.findById(table.id, 'rest-1'))?.status).toBe('ocupada')
        })

        it('should throw TableNotAvailableError the second time', async () => {
            const table = await service.create('rest-1', { number: 1, capacity: 4 })
            await service.occupy(table.id, 'rest-1', 2)
            await expect(service.occupy(table.id, 'rest-1', 2)).rejects.toThrow(TableNotAvailableError)
        })

        it('should throw TableNotAvailableError when capacity is not enough or the table is reserved', async () => {
            const small = await service.create('rest-1', { number: 1, capacity: 2 })
            const reserved = await service.create('rest-1', { number: 2, capacity: 8, status: 'reservada' })
            await expect(service.occupy(small.id, 'rest-1', 3)).rejects.toThrow(TableNotAvailableError)
            await expect(service.occupy(reserved.id, 'rest-1', 2)).rejects.toThrow(TableNotAvailableError)
        })

        it('should throw TableNotFoundError for a missing table or one of another restaurant', async () => {
            const table = await service.create('rest-1', { number: 1, capacity: 4 })
            await expect(service.occupy('nope', 'rest-1', 2)).rejects.toThrow(TableNotFoundError)
            await expect(service.occupy(table.id, 'rest-2', 2)).rejects.toThrow(TableNotFoundError)
        })

        it('should validate people before looking up the table', async () => {
            await expect(service.occupy('nope', 'rest-1', 0)).rejects.toThrow(InvalidPeopleCountError)
        })
    })

    describe('changeStatus', () => {
        it('should normalize the status and update updatedAt', async () => {
            const table = await service.create('rest-1', { number: 1, capacity: 4, status: 'ocupada' })
            await new Promise(resolve => setTimeout(resolve, 2))
            const changed = await service.changeStatus(table.id, 'rest-1', ' LIBRE ')
            expect(changed.status).toBe('libre')
            expect(changed.updatedAt > table.updatedAt).toBe(true)
            expect((await tableRepo.findById(table.id, 'rest-1'))?.status).toBe('libre')
        })

        it('should reject an invalid status', async () => {
            const table = await service.create('rest-1', { number: 1, capacity: 4 })
            await expect(service.changeStatus(table.id, 'rest-1', 'cerrada')).rejects.toThrow(InvalidTableStatusError)
        })

        it('should throw TableNotFoundError for a table of another restaurant', async () => {
            const table = await service.create('rest-1', { number: 1, capacity: 4 })
            await expect(service.changeStatus(table.id, 'rest-2', 'libre')).rejects.toThrow(TableNotFoundError)
        })
    })
})
