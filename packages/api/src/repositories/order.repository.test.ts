import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { SqliteOrderRepository } from './order.repository.js'
import { SqliteTableRepository } from './table.repository.js'
import { Database } from '@config/database.js'
import type { Order } from '@models/order.model.js'

const now = '2026-10-22T10:00:00.000Z'

const buildOrder = (id: string, tableId: string | null): Order => ({
    id,
    restaurantId: 'r1',
    tableId,
    clientId: 'client-1',
    createdAt: new Date(now),
    items: [{ id: `${id}-item`, dishId: 'd1', quantity: 1, notes: null, status: 'pendiente' }]
})

describe('SqliteOrderRepository tableNumber (Integration)', () => {
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
        await db.run(
            `INSERT INTO dishes (id, name, description, price, category, available, restaurant_id, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            ['d1', 'Pizza', null, 10, 'principal', 1, 'r1', now, now]
        )
        await new SqliteTableRepository(db).save({
            id: 'r1-mesa-5', restaurantId: 'r1', number: 5, description: null, capacity: 4,
            status: 'ocupada', createdAt: now, updatedAt: now
        })

        await repo.create(buildOrder('o-table', 'r1-mesa-5'))
        await repo.create(buildOrder('o-none', null))
        await repo.create(buildOrder('o-legacy', '5'))
    })

    afterAll(async () => {
        await db.close()
    })

    it('findById should include tableNumber', async () => {
        expect((await repo.findById('o-table'))?.tableNumber).toBe(5)
        expect((await repo.findById('o-none'))?.tableNumber).toBeNull()
        expect((await repo.findById('o-legacy'))?.tableNumber).toBeNull()
    })

    it('findActiveByRestaurant should include tableNumber', async () => {
        const orders = await repo.findActiveByRestaurant('r1')
        const byId = Object.fromEntries(orders.map(o => [o.id, o.tableNumber]))
        expect(byId).toEqual({ 'o-table': 5, 'o-none': null, 'o-legacy': null })
    })

    it('findByClientId should include tableNumber', async () => {
        const orders = await repo.findByClientId('client-1')
        expect(orders.find(o => o.id === 'o-table')?.tableNumber).toBe(5)
        expect(orders.find(o => o.id === 'o-none')?.tableNumber).toBeNull()
    })
})
