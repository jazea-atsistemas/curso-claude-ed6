import type { Request, Response, NextFunction } from 'express'
import type { PointsService } from '@services/points.service.js'
import type { AuthRequest } from '@shared/infrastructure/http/middlewares.js'

export class PointsController {
    constructor(private readonly pointsService: PointsService) {}

    // 200 con la regla, o 200 con null si el restaurante no tiene regla
    getRule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const rule = await this.pointsService.getRule(req.params.restaurantId as string)
            res.status(200).json(rule)
        } catch (error) {
            next(error)
        }
    }

    saveRule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const rule = await this.pointsService.saveRule(req.params.restaurantId as string, {
                spendAmount: req.body?.spendAmount,
                pointsAwarded: req.body?.pointsAwarded
            })
            res.status(200).json(rule)
        } catch (error) {
            next(error)
        }
    }

    deleteRule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            await this.pointsService.deleteRule(req.params.restaurantId as string)
            res.status(204).send()
        } catch (error) {
            next(error)
        }
    }

    getMyBalances = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const balances = await this.pointsService.getClientBalances(req.user.id)
            res.status(200).json(balances.map(b => ({
                restaurantId: b.restaurantId,
                restaurantName: b.restaurantName ?? null,
                balance: b.balance,
                updatedAt: b.updatedAt
            })))
        } catch (error) {
            next(error)
        }
    }
}
