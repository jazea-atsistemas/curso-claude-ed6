import type { ClientPoints, PointsRule } from '@models/points.model.js'
import { calculatePointsEarned } from '@models/points.model.js'
import type { PointsRepository } from '@repositories/points.repository.js'
import type { RestaurantRepository } from '@repositories/restaurant.repository.js'
import { InvalidPointsRuleError, RestaurantNotFoundError } from '@errors/DomainErrors.js'

export interface SavePointsRuleRequest {
    spendAmount: unknown
    pointsAwarded: unknown
}

export interface PointsAward {
    pointsEarned: number
    balance: number
}

export class PointsService {
    constructor(
        private readonly pointsRepository: PointsRepository,
        private readonly restaurantRepository: RestaurantRepository
    ) {}

    async getRule(restaurantId: string): Promise<PointsRule | null> {
        await this.ensureRestaurantExists(restaurantId)
        return this.pointsRepository.findRule(restaurantId)
    }

    async saveRule(restaurantId: string, request: SavePointsRuleRequest): Promise<PointsRule> {
        await this.ensureRestaurantExists(restaurantId)

        const { spendAmount, pointsAwarded } = request
        if (typeof spendAmount !== 'number' || !Number.isFinite(spendAmount) || Math.round(spendAmount * 100) < 1) {
            throw new InvalidPointsRuleError('spendAmount must be a number >= 0.01')
        }
        if (typeof pointsAwarded !== 'number' || !Number.isInteger(pointsAwarded) || pointsAwarded < 1) {
            throw new InvalidPointsRuleError('pointsAwarded must be an integer >= 1')
        }

        const rule: PointsRule = {
            restaurantId,
            spendAmount: Math.round(spendAmount * 100) / 100,
            pointsAwarded,
            updatedAt: new Date().toISOString()
        }
        await this.pointsRepository.saveRule(rule)
        return rule
    }

    async deleteRule(restaurantId: string): Promise<void> {
        await this.ensureRestaurantExists(restaurantId)
        await this.pointsRepository.deleteRule(restaurantId)
    }

    // Puntos que corresponden a un pago de `amountPaid` € según la regla del restaurante (0 si no hay regla)
    async calculatePointsFor(restaurantId: string, amountPaid: number): Promise<number> {
        const rule = await this.pointsRepository.findRule(restaurantId)
        return calculatePointsEarned(amountPaid, rule)
    }

    // Suma `points` al saldo del cliente en el restaurante (negativo para restar) y devuelve el saldo nuevo
    async addPoints(clientId: string, restaurantId: string, points: number): Promise<number> {
        if (points === 0) {
            return this.getClientBalance(clientId, restaurantId)
        }
        return this.pointsRepository.addToBalance(clientId, restaurantId, points, new Date().toISOString())
    }

    // Da al cliente los puntos que le corresponden por haber pagado `amountPaid` €
    async awardPoints(clientId: string, restaurantId: string, amountPaid: number): Promise<PointsAward> {
        const pointsEarned = await this.calculatePointsFor(restaurantId, amountPaid)
        const balance = await this.addPoints(clientId, restaurantId, pointsEarned)
        return { pointsEarned, balance }
    }

    async getClientBalance(clientId: string, restaurantId: string): Promise<number> {
        const points = await this.pointsRepository.findBalance(clientId, restaurantId)
        return points?.balance ?? 0
    }

    async getClientBalances(clientId: string): Promise<ClientPoints[]> {
        return this.pointsRepository.findBalancesByClient(clientId)
    }

    private async ensureRestaurantExists(restaurantId: string): Promise<void> {
        if (!(await this.restaurantRepository.findById(restaurantId))) {
            throw new RestaurantNotFoundError()
        }
    }
}
