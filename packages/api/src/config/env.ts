const MIN_SECRET_LENGTH = 32
const TEST_JWT_SECRET = 'resttek-test-secret-solo-para-pruebas-0123456789'
const DEFAULT_CORS_ORIGINS = [
    'http://localhost:4200',
    'http://localhost:4201',
    'http://localhost:4202'
]

export function loadEnv(source: NodeJS.ProcessEnv) {
    const isTest = source.NODE_ENV === 'test'
    const secret = source.JWT_SECRET || (isTest ? TEST_JWT_SECRET : undefined)

    if (!secret) {
        throw new Error('Falta la variable de entorno JWT_SECRET (obligatoria, mínimo 32 caracteres)')
    }
    if (secret.length < MIN_SECRET_LENGTH) {
        throw new Error(`JWT_SECRET es demasiado corta: debe tener al menos ${MIN_SECRET_LENGTH} caracteres`)
    }

    const origins = (source.CORS_ORIGINS ?? '')
        .split(',')
        .map(origin => origin.trim())
        .filter(origin => origin.length > 0)

    return {
        JWT_SECRET: secret,
        JWT_ISSUER: 'resttek-api',
        JWT_AUDIENCE: 'resttek-clients',
        CORS_ORIGINS: origins.length > 0 ? origins : [...DEFAULT_CORS_ORIGINS],
        isProduction: source.NODE_ENV === 'production'
    }
}

const env = loadEnv(process.env)

export const JWT_SECRET: string = env.JWT_SECRET
export const JWT_ISSUER = 'resttek-api'
export const JWT_AUDIENCE = 'resttek-clients'
export const CORS_ORIGINS: string[] = env.CORS_ORIGINS
export const isProduction: boolean = env.isProduction
