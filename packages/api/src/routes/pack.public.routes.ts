import { Router } from 'express'
import { PackController } from '@controllers/pack.controller.js'
import { dbConfig } from '@config/database.js'
import { SqlitePackRepository } from '@repositories/pack.repository.js'
import { SqliteDishRepository } from '@repositories/dish.repository.js'
import { SqliteRestaurantRepository } from '@repositories/restaurant.repository.js'
import { PackService } from '@services/pack.service.js'

const packService = new PackService(
    new SqlitePackRepository(dbConfig),
    new SqliteDishRepository(dbConfig),
    new SqliteRestaurantRepository(dbConfig)
)
const packController = new PackController(packService)

const router = Router({ mergeParams: true })

router.get('/', packController.getPublic)

export default router
