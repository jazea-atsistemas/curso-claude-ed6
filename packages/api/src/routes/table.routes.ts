import { Router } from 'express'
import { TableController } from '@controllers/table.controller.js'
import { dbConfig } from '@config/database.js'
import { SqliteTableRepository } from '@repositories/table.repository.js'
import { SqliteRestaurantRepository } from '@repositories/restaurant.repository.js'
import { TableService } from '@services/table.service.js'
import { authenticate, authorize, authorizeRestaurant } from '@shared/infrastructure/http/middlewares.js'

const tableRepository = new SqliteTableRepository(dbConfig)
const restaurantRepository = new SqliteRestaurantRepository(dbConfig)
const tableService = new TableService(tableRepository, restaurantRepository)
const tableController = new TableController(tableService)

const STAFF_READ_ROLES = ['admin', 'manager', 'camarero', 'cocinero']
const MANAGE_ROLES = ['admin', 'manager']
const STATUS_ROLES = ['admin', 'manager', 'camarero']

const router = Router({ mergeParams: true })

// /available antes de /:id para que Express no lo tome como un id
router.get('/', authenticate, authorize(STAFF_READ_ROLES), authorizeRestaurant(), tableController.getAll)
router.get('/available', authenticate, authorize(['cliente']), tableController.getAvailable)
router.post('/:id/occupy', authenticate, authorize(['cliente']), tableController.occupy)
router.get('/:id', authenticate, authorize(STAFF_READ_ROLES), authorizeRestaurant(), tableController.getById)
router.post('/', authenticate, authorize(MANAGE_ROLES), authorizeRestaurant(), tableController.create)
router.put('/:id', authenticate, authorize(MANAGE_ROLES), authorizeRestaurant(), tableController.update)
router.delete('/:id', authenticate, authorize(MANAGE_ROLES), authorizeRestaurant(), tableController.delete)
router.patch('/:id/status', authenticate, authorize(STATUS_ROLES), authorizeRestaurant(), tableController.changeStatus)

export default router
