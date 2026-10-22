import type { Response, NextFunction } from 'express'
import type { BillService } from '@services/bill.service.js'
import type { AuthRequest } from '@shared/infrastructure/http/middlewares.js'

// A diferencia de OrderController, delega los errores en el errorHandler con next(error)
export class BillController {
    constructor(private readonly billService: BillService) {}

    requestBill = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const bill = await this.billService.requestBill(req.params.id as string, req.user.id)
            res.status(200).json(bill)
        } catch (error) {
            next(error)
        }
    }
}
