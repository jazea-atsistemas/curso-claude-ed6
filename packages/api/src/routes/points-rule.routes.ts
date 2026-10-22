import { Router } from 'express'
import { PointsController } from '@controllers/points.controller.js'
import { dbConfig } from '@config/database.js'
import { SqlitePointsRepository } from '@repositories/points.repository.js'
import { SqliteRestaurantRepository } from '@repositories/restaurant.repository.js'
import { PointsService } from '@services/points.service.js'
import { authenticate, authorize, authorizeRestaurant } from '@shared/infrastructure/http/middlewares.js'

const pointsService = new PointsService(new SqlitePointsRepository(dbConfig), new SqliteRestaurantRepository(dbConfig))
const pointsController = new PointsController(pointsService)

const MANAGE_ROLES = ['admin', 'manager']

// Montado en /api/v1/restaurants/:restaurantId/points-rule
const router = Router({ mergeParams: true })

router.get('/', authenticate, authorize(MANAGE_ROLES), authorizeRestaurant(), pointsController.getRule)
router.put('/', authenticate, authorize(MANAGE_ROLES), authorizeRestaurant(), pointsController.saveRule)
router.delete('/', authenticate, authorize(MANAGE_ROLES), authorizeRestaurant(), pointsController.deleteRule)

export default router
