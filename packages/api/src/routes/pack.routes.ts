import { Router } from 'express'
import { PackController } from '@controllers/pack.controller.js'
import { dbConfig } from '@config/database.js'
import { SqlitePackRepository } from '@repositories/pack.repository.js'
import { SqliteDishRepository } from '@repositories/dish.repository.js'
import { SqliteRestaurantRepository } from '@repositories/restaurant.repository.js'
import { PackService } from '@services/pack.service.js'
import { authenticate, authorize, authorizeRestaurant } from '@shared/infrastructure/http/middlewares.js'

const packService = new PackService(
    new SqlitePackRepository(dbConfig),
    new SqliteDishRepository(dbConfig),
    new SqliteRestaurantRepository(dbConfig)
)
const packController = new PackController(packService)

const STAFF_READ_ROLES = ['admin', 'manager', 'camarero', 'cocinero']
const MANAGE_ROLES = ['admin', 'manager']

const router = Router({ mergeParams: true })

router.get('/', authenticate, authorize(STAFF_READ_ROLES), authorizeRestaurant(), packController.getAll)
router.get('/:id', authenticate, authorize(STAFF_READ_ROLES), authorizeRestaurant(), packController.getById)
router.post('/', authenticate, authorize(MANAGE_ROLES), authorizeRestaurant(), packController.create)
router.put('/:id', authenticate, authorize(MANAGE_ROLES), authorizeRestaurant(), packController.update)
router.delete('/:id', authenticate, authorize(MANAGE_ROLES), authorizeRestaurant(), packController.delete)

export default router
