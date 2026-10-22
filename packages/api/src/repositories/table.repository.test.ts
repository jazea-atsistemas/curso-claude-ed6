import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { SqliteTableRepository } from './table.repository.js'
import { Database } from '@config/database.js'
import type { Table } from '@models/table.model.js'

const now = '2026-10-22T10:00:00.000Z'

const buildTable = (overrides: Partial<Table>): Table => ({
    id: 't-x',
    restaurantId: 'r1',
    number: 99,
    description: null,
    capacity: 4,
    status: 'libre',
    createdAt: now,
    updatedAt: now,
    ...overrides
})

describe('SqliteTableRepository (Integration)', () => {
    let db: Database
    let repo: SqliteTableRepository

    beforeAll(async () => {
        process.env.NODE_ENV = 'test'
        db = new Database()
        await db.initialize()
        repo = new SqliteTableRepository(db)

        for (const id of ['r1', 'r2']) {
            await db.run(
                `INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [id, `Rest ${id}`, 'Calle 1', `${id}@test.com`, '600000000', 'Ana', 'Pérez', now, now]
            )
        }

        await repo.save(buildTable({ id: 't3', number: 3, capacity: 4 }))
        await repo.save(buildTable({ id: 't1', number: 1, capacity: 2, description: 'Ventana' }))
        await repo.save(buildTable({ id: 't2', number: 2, capacity: 6, status: 'ocupada' }))
        await repo.save(buildTable({ id: 't4', number: 4, capacity: 8, status: 'reservada' }))
        await repo.save(buildTable({ id: 't5', number: 5, capacity: 4 }))
        await repo.save(buildTable({ id: 'r2-t1', restaurantId: 'r2', number: 1, capacity: 10 }))
    })

    afterAll(async () => {
        await db.close()
    })

    describe('CRUD', () => {
        it('should save and find a table by id and restaurant', async () => {
            const found = await repo.findById('t1', 'r1')
            expect(found).toEqual(buildTable({ id: 't1', number: 1, capacity: 2, description: 'Ventana' }))
        })

        it('should not find a table of another restaurant', async () => {
            expect(await repo.findById('t1', 'r2')).toBeNull()
        })

        it('should list tables of a restaurant ordered by number', async () => {
            const tables = await repo.findByRestaurantId('r1')
            expect(tables.map(t => t.number)).toEqual([1, 2, 3, 4, 5])
        })

        it('should find a table by number within a restaurant', async () => {
            expect((await repo.findByNumber('r1', 3))?.id).toBe('t3')
            expect((await repo.findByNumber('r2', 1))?.id).toBe('r2-t1')
            expect(await repo.findByNumber('r2', 3)).toBeNull()
        })

        it('should update an existing table', async () => {
            await repo.save(buildTable({ id: 't-upd', number: 50, capacity: 2 }))
            await repo.save(buildTable({ id: 't-upd', number: 51, capacity: 3, description: 'Barra', status: 'reservada', updatedAt: '2026-10-22T11:00:00.000Z' }))
            const found = await repo.findById('t-upd', 'r1')
            expect(found).toMatchObject({ number: 51, capacity: 3, description: 'Barra', status: 'reservada', updatedAt: '2026-10-22T11:00:00.000Z', createdAt: now })
        })

        it('should delete a table', async () => {
            await repo.save(buildTable({ id: 't-del', number: 60 }))
            await repo.delete('t-del', 'r1')
            expect(await repo.findById('t-del', 'r1')).toBeNull()
        })
    })

    describe('findAvailable', () => {
        it('should return only free tables with enough capacity ordered by capacity and number', async () => {
            const tables = await repo.findAvailable('r1', 3)
            expect(tables.map(t => t.id)).toEqual(['t3', 't5'])
        })

        it('should exclude occupied, reserved and smaller tables', async () => {
            const tables = await repo.findAvailable('r1', 5)
            expect(tables).toEqual([])
        })
    })

    describe('occupyIfAvailable', () => {
        it('should occupy a free table only once', async () => {
            await repo.save(buildTable({ id: 't-occ', number: 70, capacity: 4 }))

            expect(await repo.occupyIfAvailable('t-occ', 'r1', 4, '2026-10-22T12:00:00.000Z')).toBe(true)
            expect(await repo.occupyIfAvailable('t-occ', 'r1', 4, '2026-10-22T12:00:01.000Z')).toBe(false)

            const found = await repo.findById('t-occ', 'r1')
            expect(found?.status).toBe('ocupada')
            expect(found?.updatedAt).toBe('2026-10-22T12:00:00.000Z')
        })

        it('should return false when capacity is not enough', async () => {
            await repo.save(buildTable({ id: 't-small', number: 71, capacity: 2 }))
            expect(await repo.occupyIfAvailable('t-small', 'r1', 3, now)).toBe(false)
            expect((await repo.findById('t-small', 'r1'))?.status).toBe('libre')
        })

        it('should return false for a table of another restaurant', async () => {
            expect(await repo.occupyIfAvailable('r2-t1', 'r1', 2, now)).toBe(false)
            expect((await repo.findById('r2-t1', 'r2'))?.status).toBe('libre')
        })

        it('should return false for a reserved table', async () => {
            expect(await repo.occupyIfAvailable('t4', 'r1', 2, now)).toBe(false)
        })
    })
})
