import { Database } from '@config/database.js'
import type { ClientPoints, PointsRule } from '@models/points.model.js'

export interface PointsRepository {
    findRule(restaurantId: string): Promise<PointsRule | null>
    saveRule(rule: PointsRule): Promise<void>
    deleteRule(restaurantId: string): Promise<void>
    findBalance(clientId: string, restaurantId: string): Promise<ClientPoints | null>
    findBalancesByClient(clientId: string): Promise<ClientPoints[]>
    // Suma `delta` (negativo para canjear) al saldo y devuelve el saldo resultante
    addToBalance(clientId: string, restaurantId: string, delta: number, updatedAt: string): Promise<number>
}

const RULE_COLUMNS = 'SELECT restaurant_id as restaurantId, spend_amount as spendAmount, points_awarded as pointsAwarded, updated_at as updatedAt FROM points_rules'

const BALANCE_COLUMNS = `SELECT cp.client_id as clientId, cp.restaurant_id as restaurantId, r.name as restaurantName,
    cp.balance as balance, cp.updated_at as updatedAt
    FROM client_points cp
    LEFT JOIN restaurants r ON r.id = cp.restaurant_id`

export class SqlitePointsRepository implements PointsRepository {
    constructor(private readonly db: Database) {}

    async findRule(restaurantId: string): Promise<PointsRule | null> {
        const row = await this.db.get<PointsRule>(`${RULE_COLUMNS} WHERE restaurant_id = ?`, [restaurantId])
        return row ?? null
    }

    async saveRule(rule: PointsRule): Promise<void> {
        await this.db.run(
            `INSERT INTO points_rules (restaurant_id, spend_amount, points_awarded, updated_at)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(restaurant_id) DO UPDATE SET
                spend_amount = excluded.spend_amount,
                points_awarded = excluded.points_awarded,
                updated_at = excluded.updated_at`,
            [rule.restaurantId, rule.spendAmount, rule.pointsAwarded, rule.updatedAt]
        )
    }

    async deleteRule(restaurantId: string): Promise<void> {
        await this.db.run('DELETE FROM points_rules WHERE restaurant_id = ?', [restaurantId])
    }

    async findBalance(clientId: string, restaurantId: string): Promise<ClientPoints | null> {
        const row = await this.db.get<ClientPoints>(
            `${BALANCE_COLUMNS} WHERE cp.client_id = ? AND cp.restaurant_id = ?`,
            [clientId, restaurantId]
        )
        return row ?? null
    }

    async findBalancesByClient(clientId: string): Promise<ClientPoints[]> {
        return this.db.all<ClientPoints>(
            `${BALANCE_COLUMNS} WHERE cp.client_id = ? ORDER BY r.name ASC`,
            [clientId]
        )
    }

    async addToBalance(clientId: string, restaurantId: string, delta: number, updatedAt: string): Promise<number> {
        await this.db.run(
            `INSERT INTO client_points (client_id, restaurant_id, balance, updated_at)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(client_id, restaurant_id) DO UPDATE SET
                balance = balance + excluded.balance,
                updated_at = excluded.updated_at`,
            [clientId, restaurantId, delta, updatedAt]
        )
        const row = await this.db.get<{ balance: number }>(
            'SELECT balance FROM client_points WHERE client_id = ? AND restaurant_id = ?',
            [clientId, restaurantId]
        )
        return row?.balance ?? 0
    }
}
