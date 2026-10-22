import express from 'express'
import cors from 'cors'
import authRoutes from '@employee/infrastructure/http/auth.routes.js'
import employeeRoutes from '@employee/infrastructure/http/employee.routes.js'
import restaurantEmployeeRoutes from '@employee/infrastructure/http/restaurant-employee.routes.js'
import restaurantRoutes from '@routes/restaurant.routes.js'
import ingredientRoutes from '@routes/ingredient.routes.js'
import dishRoutes from '@routes/dish.routes.js'
import tableRoutes from '@routes/table.routes.js'
import publicRestaurantRoutes from '@routes/restaurant.public.routes.js'
import publicDishRoutes from '@routes/dish.public.routes.js'
import orderRoutes from '@routes/order.routes.js'
import { errorHandler } from '@shared/infrastructure/http/errorHandler.js'
import { openApiYaml, openApiDocument } from '@config/openapi.js'
import swaggerUi from 'swagger-ui-express'

const app = express()

app.use(cors())
app.use(express.json())

app.use('/api/v1/orders', orderRoutes)
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/employees', employeeRoutes)
app.use('/api/v1/public/restaurants', publicRestaurantRoutes)
app.use('/api/v1/public/restaurants/:restaurantId/dishes', publicDishRoutes)
app.use('/api/v1/restaurants', restaurantRoutes)
app.use('/api/v1/restaurants/:restaurantId/ingredients', ingredientRoutes)
app.use('/api/v1/restaurants/:restaurantId/dishes', dishRoutes)
app.use('/api/v1/restaurants/:restaurantId/tables', tableRoutes)
app.use('/api/v1/restaurants/:restaurantId/employees', restaurantEmployeeRoutes)

app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' })
})

// Documentación OpenAPI: especificación en bruto y Swagger UI
app.get('/api/openapi.yaml', (_req, res) => {
    res.type('application/yaml').send(openApiYaml)
})
app.get('/api/openapi.json', (_req, res) => {
    res.status(200).json(openApiDocument)
})
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument, {
    customSiteTitle: 'Resttek API'
}))

app.use(errorHandler)

export default app
