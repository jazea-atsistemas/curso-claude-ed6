import { Router } from 'express'
import { PointsController } from '@controllers/points.controller.js'
import { dbConfig } from '@config/database.js'
import { SqlitePointsRepository } from '@repositories/points.repository.js'
import { SqliteRestaurantRepository } from '@repositories/restaurant.repository.js'
import { PointsService } from '@services/points.service.js'
import { authenticate, authorize } from '@shared/infrastructure/http/middlewares.js'

const pointsService = new PointsService(new SqlitePointsRepository(dbConfig), new SqliteRestaurantRepository(dbConfig))
const pointsController = new PointsController(pointsService)

// Montado en /api/v1/points
const router = Router()

router.get('/mine', authenticate, authorize(['cliente']), pointsController.getMyBalances)

export default router
