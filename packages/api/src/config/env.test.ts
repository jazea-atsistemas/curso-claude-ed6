import { describe, it, expect } from 'vitest'
import { loadEnv } from './env.js'

const SECRETO_VALIDO = 'a'.repeat(32)

describe('loadEnv', () => {
    it('lanza un error si falta JWT_SECRET', () => {
        expect(() => loadEnv({ NODE_ENV: 'development' })).toThrow(/JWT_SECRET/)
    })

    it('lanza un error si JWT_SECRET es demasiado corto', () => {
        expect(() => loadEnv({ NODE_ENV: 'production', JWT_SECRET: 'corto' })).toThrow(/32 caracteres/)
    })

    it('acepta un JWT_SECRET válido', () => {
        const env = loadEnv({ NODE_ENV: 'production', JWT_SECRET: SECRETO_VALIDO })
        expect(env.JWT_SECRET).toBe(SECRETO_VALIDO)
        expect(env.isProduction).toBe(true)
        expect(env.JWT_ISSUER).toBe('resttek-api')
        expect(env.JWT_AUDIENCE).toBe('resttek-clients')
    })

    it('usa un secreto fijo de pruebas con NODE_ENV=test', () => {
        const env = loadEnv({ NODE_ENV: 'test' })
        expect(env.JWT_SECRET.length).toBeGreaterThanOrEqual(32)
        expect(env.isProduction).toBe(false)
    })

    it('usa los orígenes CORS por defecto', () => {
        const env = loadEnv({ NODE_ENV: 'test' })
        expect(env.CORS_ORIGINS).toEqual([
            'http://localhost:4200',
            'http://localhost:4201',
            'http://localhost:4202'
        ])
    })

    it('separa CORS_ORIGINS por comas y recorta espacios', () => {
        const env = loadEnv({
            NODE_ENV: 'test',
            CORS_ORIGINS: 'https://a.com, https://b.com ,'
        })
        expect(env.CORS_ORIGINS).toEqual(['https://a.com', 'https://b.com'])
    })
})
