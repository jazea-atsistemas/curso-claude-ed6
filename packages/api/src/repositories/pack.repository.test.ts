import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { SqlitePackRepository } from './pack.repository.js'
import { Database } from '@config/database.js'
import type { Pack } from '@models/pack.model.js'

const now = '2026-10-22T10:00:00.000Z'

const buildPack = (overrides: Partial<Pack> = {}): Pack => ({
    id: 'pack-1',
    restaurantId: 'r1',
    name: 'Menú del día',
    description: null,
    price: 20,
    active: true,
    slots: [
        { id: 's-entrante', name: 'Entrante', category: 'entrante', restriction: 'bloquear', dishIds: [] },
        { id: 's-bebida', name: 'Bebida', category: 'bebida', restriction: 'bloquear', dishIds: ['cerveza'] }
    ],
    createdAt: now,
    updatedAt: now,
    ...overrides
})

describe('SqlitePackRepository (Integration)', () => {
    let db: Database
    let repo: SqlitePackRepository

    beforeAll(async () => {
        process.env.NODE_ENV = 'test'
        db = new Database()
        await db.initialize()
        repo = new SqlitePackRepository(db)

        for (const id of ['r1', 'r2']) {
            await db.run(
                `INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [id, `Rest ${id}`, 'Calle 1', `${id}@test.com`, '600000000', 'Ana', 'Pérez', now, now]
            )
        }
        for (const [id, category] of [['cerveza', 'bebida'], ['agua', 'bebida']]) {
            await db.run(
                `INSERT INTO dishes (id, name, description, price, category, available, restaurant_id, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [id, id, null, 2, category, 1, 'r1', now, now]
            )
        }
    })

    afterAll(async () => {
        await db.close()
    })

    it('should save and read a pack with its ordered slots and dish lists', async () => {
        await repo.save(buildPack())
        expect(await repo.findById('pack-1', 'r1')).toEqual(buildPack())
        expect(await repo.findById('pack-1', 'r2')).toBeNull()
    })

    it('should replace the slots on update', async () => {
        await repo.save(buildPack({
            price: 18.5,
            active: false,
            slots: [{ id: 's-bebida-2', name: 'Bebida', category: 'bebida', restriction: 'permitir', dishIds: ['agua'] }]
        }))
        const pack = await repo.findById('pack-1', 'r1')
        expect(pack?.price).toBe(18.5)
        expect(pack?.active).toBe(false)
        expect(pack?.slots).toEqual([{ id: 's-bebida-2', name: 'Bebida', category: 'bebida', restriction: 'permitir', dishIds: ['agua'] }])
    })

    it('should list packs by restaurant', async () => {
        expect((await repo.findByRestaurantId('r1')).map(p => p.id)).toEqual(['pack-1'])
        expect(await repo.findByRestaurantId('r2')).toEqual([])
    })

    it('should drop a deleted dish from the slot lists', async () => {
        await db.run('DELETE FROM dishes WHERE id = ?', ['agua'])
        expect((await repo.findById('pack-1', 'r1'))?.slots[0]?.dishIds).toEqual([])
    })

    it('should delete the pack and its slots', async () => {
        await repo.delete('pack-1', 'r1')
        expect(await repo.findById('pack-1', 'r1')).toBeNull()
        expect(await db.all('SELECT * FROM pack_slots')).toEqual([])
    })

    it('should add the pack columns to order_items idempotently', async () => {
        const columns = (await db.all<{ name: string }>('PRAGMA table_info(order_items)')).map(c => c.name)
        expect(columns).toEqual(expect.arrayContaining(['pack_id', 'pack_line_id', 'pack_name', 'pack_price']))
        await expect((db as any).runInitialMigrations()).resolves.toBeUndefined()
    })
})
