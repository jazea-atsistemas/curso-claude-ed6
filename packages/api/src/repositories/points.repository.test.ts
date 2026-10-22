import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { SqlitePointsRepository } from './points.repository.js'
import { Database } from '@config/database.js'

const now = '2026-10-22T10:00:00.000Z'
const later = '2026-10-22T11:00:00.000Z'

describe('SqlitePointsRepository (Integration)', () => {
    let db: Database
    let repo: SqlitePointsRepository

    beforeAll(async () => {
        process.env.NODE_ENV = 'test'
        db = new Database()
        await db.initialize()
        repo = new SqlitePointsRepository(db)

        for (const [id, name] of [['r1', 'Bravo'], ['r2', 'Alfa']]) {
            await db.run(
                `INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [id, name, 'Calle 1', `${id}@test.com`, '600000000', 'Ana', 'Pérez', now, now]
            )
        }
        await db.run(
            `INSERT INTO employees (id, first_name, last_name, email, password_hash, role, restaurant_id)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            ['c1', 'Laura', 'Gómez', 'c1@test.com', 'hash', 'cliente', null]
        )
    })

    afterAll(async () => {
        await db.close()
    })

    it('añade las columnas de la cuenta a orders', async () => {
        const columns = await db.all<{ name: string }>('PRAGMA table_info(orders)')
        expect(columns.map(c => c.name)).toEqual(expect.arrayContaining(['total', 'points_earned', 'billed_at']))
    })

    it('devuelve null si el restaurante no tiene regla', async () => {
        expect(await repo.findRule('r1')).toBeNull()
    })

    it('crea, actualiza y borra la regla de un restaurante', async () => {
        await repo.saveRule({ restaurantId: 'r1', spendAmount: 10, pointsAwarded: 1, updatedAt: now })
        expect(await repo.findRule('r1')).toEqual({ restaurantId: 'r1', spendAmount: 10, pointsAwarded: 1, updatedAt: now })

        await repo.saveRule({ restaurantId: 'r1', spendAmount: 5, pointsAwarded: 2, updatedAt: later })
        expect(await repo.findRule('r1')).toEqual({ restaurantId: 'r1', spendAmount: 5, pointsAwarded: 2, updatedAt: later })

        await repo.deleteRule('r1')
        expect(await repo.findRule('r1')).toBeNull()
    })

    it('acumula el saldo por cliente y restaurante', async () => {
        expect(await repo.findBalance('c1', 'r1')).toBeNull()

        expect(await repo.addToBalance('c1', 'r1', 3, now)).toBe(3)
        expect(await repo.addToBalance('c1', 'r1', 4, later)).toBe(7)
        expect(await repo.addToBalance('c1', 'r2', 2, now)).toBe(2)
        expect(await repo.addToBalance('c1', 'r1', -5, later)).toBe(2)

        expect(await repo.findBalance('c1', 'r1')).toEqual({
            clientId: 'c1', restaurantId: 'r1', restaurantName: 'Bravo', balance: 2, updatedAt: later
        })
    })

    it('lista los saldos de un cliente ordenados por nombre de restaurante', async () => {
        const balances = await repo.findBalancesByClient('c1')
        expect(balances.map(b => [b.restaurantName, b.balance])).toEqual([['Alfa', 2], ['Bravo', 2]])
        expect(await repo.findBalancesByClient('otro')).toEqual([])
    })
})
