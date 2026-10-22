import type { Request, Response, NextFunction } from 'express'
import type { PackService, PackDTO } from '@services/pack.service.js'

export class PackController {
    constructor(private readonly packService: PackService) {}

    getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            res.status(200).json(await this.packService.findByRestaurantId(req.params.restaurantId as string))
        } catch (error) {
            next(error)
        }
    }

    getPublic = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            res.status(200).json(await this.packService.listPublic(req.params.restaurantId as string))
        } catch (error) {
            next(error)
        }
    }

    getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            res.status(200).json(await this.packService.getById(req.params.id as string, req.params.restaurantId as string))
        } catch (error) {
            next(error)
        }
    }

    create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const pack = await this.packService.create(req.params.restaurantId as string, this.toDTO(req))
            res.status(201).json(pack)
        } catch (error) {
            next(error)
        }
    }

    update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const pack = await this.packService.update(req.params.id as string, req.params.restaurantId as string, this.toDTO(req))
            res.status(200).json(pack)
        } catch (error) {
            next(error)
        }
    }

    delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            await this.packService.delete(req.params.id as string, req.params.restaurantId as string)
            res.status(204).send()
        } catch (error) {
            next(error)
        }
    }

    private toDTO(req: Request): PackDTO {
        return {
            name: req.body?.name,
            description: req.body?.description ?? null,
            price: req.body?.price,
            active: req.body?.active,
            slots: req.body?.slots
        }
    }
}
