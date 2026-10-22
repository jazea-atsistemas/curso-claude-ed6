import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { SqliteOrderRepository } from './order.repository.js'
import { Database } from '@config/database.js'
import { calculateOrderItemsTotal } from '@models/order.model.js'

const now = '2026-10-22T10:00:00.000Z'

describe('SqliteOrderRepository packs (Integration)', () => {
    let db: Database
    let repo: SqliteOrderRepository

    beforeAll(async () => {
        process.env.NODE_ENV = 'test'
        db = new Database()
        await db.initialize()
        repo = new SqliteOrderRepository(db)

        await db.run(
            `INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            ['r1', 'Rest 1', 'Calle 1', 'r1@test.com', '600000000', 'Ana', 'Pérez', now, now]
        )
        for (const [id, category, price] of [['d1', 'principal', 12.5], ['d2', 'bebida', 2], ['d3', 'bebida', 3]] as const) {
            await db.run(
                `INSERT INTO dishes (id, name, description, price, category, available, restaurant_id, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [id, id, null, price, category, 1, 'r1', now, now]
            )
        }

        const pack = { packId: 'pack-1', packLineId: 'line-1', packName: 'Menú', packPrice: 15 }
        const loose = { packId: null, packLineId: null, packName: null, packPrice: null }
        await repo.create({
            id: 'o1',
            restaurantId: 'r1',
            tableId: null,
            clientId: 'c1',
            createdAt: new Date(now),
            items: [
                { id: 'i1', dishId: 'd1', quantity: 1, notes: null, status: 'pendiente', ...pack },
                { id: 'i2', dishId: 'd2', quantity: 1, notes: null, status: 'pendiente', ...pack },
                { id: 'i3', dishId: 'd3', quantity: 1, notes: null, status: 'pendiente', ...loose }
            ]
        })
    })

    afterAll(async () => {
        await db.close()
    })

    it('should persist and read back the pack fields of each item, in insertion order', async () => {
        const order = await repo.findById('o1')
        expect(order?.items.map(i => [i.id, i.packId, i.packLineId, i.packName, i.packPrice])).toEqual([
            ['i1', 'pack-1', 'line-1', 'Menú', 15],
            ['i2', 'pack-1', 'line-1', 'Menú', 15],
            ['i3', null, null, null, null]
        ])
        expect(calculateOrderItemsTotal(order!.items)).toBe(18)
    })
})
