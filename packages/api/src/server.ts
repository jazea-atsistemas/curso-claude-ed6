// El entorno se valida primero: si falta JWT_SECRET abortamos con un mensaje legible.
try {
    await import('@config/env.js')
} catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`\nError de configuración: ${message}`)
    console.error('Crea packages/api/.env a partir de .env.example (ver README) o exporta JWT_SECRET.\n')
    process.exit(1)
}

const { default: app } = await import('./app.js')
const { dbConfig } = await import('@config/database.js')

const PORT = process.env.PORT || 3000

const startServer = async () => {
    try {
        await dbConfig.initialize()
        console.log('Database initialized successfully.')

        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`)
        })
    } catch (error) {
        console.error('Failed to start the server:', error)
        process.exit(1)
    }
}

startServer()
