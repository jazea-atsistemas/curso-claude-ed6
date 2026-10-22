import { Router } from 'express'
import { OrderController } from '@controllers/order.controller.js'
import { OrderService } from '@services/order.service.js'
import { SqliteOrderRepository } from '@repositories/order.repository.js'
import { SqliteTableRepository } from '@repositories/table.repository.js'
import { SqlitePackRepository } from '@repositories/pack.repository.js'
import { SqliteDishRepository } from '@repositories/dish.repository.js'
import { SqliteRestaurantRepository } from '@repositories/restaurant.repository.js'
import { PackService } from '@services/pack.service.js'
import { dbConfig } from '@config/database.js'
import { authenticate } from '@shared/infrastructure/http/middlewares.js'

const orderRepository = new SqliteOrderRepository(dbConfig)
const tableRepository = new SqliteTableRepository(dbConfig)
const packService = new PackService(
    new SqlitePackRepository(dbConfig),
    new SqliteDishRepository(dbConfig),
    new SqliteRestaurantRepository(dbConfig)
)
const orderService = new OrderService(orderRepository, tableRepository, packService)
const orderController = new OrderController(orderService)

const router = Router()

router.post('/', authenticate, orderController.createOrder.bind(orderController))
router.get('/active', authenticate, orderController.getActiveOrders.bind(orderController))
router.get('/mine', authenticate, orderController.getMyOrders.bind(orderController))
router.get('/:id', authenticate, orderController.getById.bind(orderController))
router.patch('/:orderId/items/:itemId/status', authenticate, orderController.updateItemStatus.bind(orderController))

export default router
