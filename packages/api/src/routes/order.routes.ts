import { Router } from 'express'
import { OrderController } from '@controllers/order.controller.js'
import { OrderService } from '@services/order.service.js'
import { SqliteOrderRepository } from '@repositories/order.repository.js'
import { SqliteTableRepository } from '@repositories/table.repository.js'
import { SqlitePointsRepository } from '@repositories/points.repository.js'
import { SqliteRestaurantRepository } from '@repositories/restaurant.repository.js'
import { PointsService } from '@services/points.service.js'
import { BillService } from '@services/bill.service.js'
import { BillController } from '@controllers/bill.controller.js'
import { dbConfig } from '@config/database.js'
import { authenticate, authorize } from '@shared/infrastructure/http/middlewares.js'

const orderRepository = new SqliteOrderRepository(dbConfig)
const tableRepository = new SqliteTableRepository(dbConfig)
const orderService = new OrderService(orderRepository, tableRepository)
const orderController = new OrderController(orderService)

const pointsService = new PointsService(new SqlitePointsRepository(dbConfig), new SqliteRestaurantRepository(dbConfig))
const billService = new BillService(orderRepository, pointsService)
const billController = new BillController(billService)

const router = Router()

router.post('/', authenticate, orderController.createOrder.bind(orderController))
router.get('/active', authenticate, orderController.getActiveOrders.bind(orderController))
router.get('/mine', authenticate, orderController.getMyOrders.bind(orderController))
router.get('/:id', authenticate, orderController.getById.bind(orderController))
router.post('/:id/bill', authenticate, authorize(['cliente']), billController.requestBill)
router.patch('/:orderId/items/:itemId/status', authenticate, orderController.updateItemStatus.bind(orderController))

export default router
