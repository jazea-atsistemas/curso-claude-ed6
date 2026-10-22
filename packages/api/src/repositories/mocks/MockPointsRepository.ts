import type { PointsRepository } from '@repositories/points.repository.js'
import type { ClientPoints, PointsRule } from '@models/points.model.js'

export class MockPointsRepository implements PointsRepository {
    rules: Map<string, PointsRule> = new Map()
    balances: Map<string, ClientPoints> = new Map()

    private key(clientId: string, restaurantId: string): string {
        return `${clientId}::${restaurantId}`
    }

    async findRule(restaurantId: string): Promise<PointsRule | null> {
        const rule = this.rules.get(restaurantId)
        return rule ? { ...rule } : null
    }

    async saveRule(rule: PointsRule): Promise<void> {
        this.rules.set(rule.restaurantId, { ...rule })
    }

    async deleteRule(restaurantId: string): Promise<void> {
        this.rules.delete(restaurantId)
    }

    async findBalance(clientId: string, restaurantId: string): Promise<ClientPoints | null> {
        const balance = this.balances.get(this.key(clientId, restaurantId))
        return balance ? { ...balance } : null
    }

    async findBalancesByClient(clientId: string): Promise<ClientPoints[]> {
        return Array.from(this.balances.values())
            .filter(b => b.clientId === clientId)
            .map(b => ({ ...b }))
    }

    async addToBalance(clientId: string, restaurantId: string, delta: number, updatedAt: string): Promise<number> {
        const key = this.key(clientId, restaurantId)
        const current = this.balances.get(key)
        const balance = (current?.balance ?? 0) + delta
        this.balances.set(key, { clientId, restaurantId, balance, updatedAt })
        return balance
    }
}
