import { describe, it, expect, vi } from 'vitest'
import jwt from 'jsonwebtoken'
import type { Response, NextFunction } from 'express'
import { authenticate, authorizeRestaurant, restaurantScope, type AuthRequest } from './middlewares.js'
import { JWT_SECRET, JWT_ISSUER, JWT_AUDIENCE } from '@config/env.js'

const payload = { id: 'user-1', role: 'manager' }

const signValid = (options: jwt.SignOptions = {}) =>
    jwt.sign(payload, JWT_SECRET, {
        algorithm: 'HS256',
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
        expiresIn: '1h',
        ...options
    })

const run = (authorization?: string) => {
    const req = { headers: { authorization } } as unknown as AuthRequest
    const json = vi.fn()
    const status = vi.fn().mockReturnValue({ json })
    const res = { status } as unknown as Response
    const next = vi.fn() as unknown as NextFunction
    authenticate(req, res, next)
    return { req, status, json, next }
}

const expectUnauthorized = (result: ReturnType<typeof run>) => {
    expect(result.status).toHaveBeenCalledWith(401)
    expect(result.next).not.toHaveBeenCalled()
    expect(result.req.user).toBeUndefined()
}

const base64url = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')

describe('authenticate', () => {
    it('llama a next y fija req.user con un token válido', () => {
        const result = run(`Bearer ${signValid()}`)

        expect(result.next).toHaveBeenCalledOnce()
        expect(result.status).not.toHaveBeenCalled()
        expect(result.req.user).toMatchObject(payload)
    })

    it('responde 401 si falta la cabecera Authorization', () => {
        expectUnauthorized(run(undefined))
    })

    it('responde 401 si la cabecera no usa el esquema Bearer', () => {
        expectUnauthorized(run(`Basic ${signValid()}`))
    })

    it('responde 401 si el token está vacío', () => {
        expectUnauthorized(run('Bearer '))
    })

    it('responde 401 con un token mal formado', () => {
        expectUnauthorized(run('Bearer esto-no-es-un-jwt'))
    })

    it('responde 401 con un token firmado con otro secreto', () => {
        const token = jwt.sign(payload, 'otro-secreto-distinto-de-al-menos-32-caracteres', {
            algorithm: 'HS256',
            issuer: JWT_ISSUER,
            audience: JWT_AUDIENCE,
            expiresIn: '1h'
        })
        expectUnauthorized(run(`Bearer ${token}`))
    })

    it('responde 401 con un token con alg none', () => {
        const now = Math.floor(Date.now() / 1000)
        const token = `${base64url({ alg: 'none', typ: 'JWT' })}.${base64url({
            ...payload,
            iss: JWT_ISSUER,
            aud: JWT_AUDIENCE,
            iat: now,
            exp: now + 3600
        })}.`
        expectUnauthorized(run(`Bearer ${token}`))
    })

    it('responde 401 con un token expirado', () => {
        const token = signValid({ expiresIn: -60 })
        expectUnauthorized(run(`Bearer ${token}`))
    })

    it('responde 401 si el issuer es incorrecto', () => {
        expectUnauthorized(run(`Bearer ${signValid({ issuer: 'otro-emisor' })}`))
    })

    it('responde 401 si el audience es incorrecto', () => {
        expectUnauthorized(run(`Bearer ${signValid({ audience: 'otra-audiencia' })}`))
    })

    it('responde 401 si el token no tiene issuer ni audience', () => {
        const token = jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256', expiresIn: '1h' })
        expectUnauthorized(run(`Bearer ${token}`))
    })
})

const runAuthorizeRestaurant = (
    user: AuthRequest['user'],
    params: Record<string, string> = { restaurantId: 'rest-A' },
    paramName?: string
) => {
    const req = { user, params } as unknown as AuthRequest
    const json = vi.fn()
    const status = vi.fn().mockReturnValue({ json })
    const res = { status } as unknown as Response
    const next = vi.fn() as unknown as NextFunction
    authorizeRestaurant(paramName)(req, res, next)
    return { status, json, next }
}

describe('authorizeRestaurant', () => {
    it('deja pasar al admin a cualquier restaurante', () => {
        const result = runAuthorizeRestaurant({ id: 'a', role: 'admin', restaurantId: null })

        expect(result.next).toHaveBeenCalledOnce()
        expect(result.status).not.toHaveBeenCalled()
    })

    it('deja pasar al personal del mismo restaurante', () => {
        const result = runAuthorizeRestaurant({ id: 'm', role: 'manager', restaurantId: 'rest-A' })

        expect(result.next).toHaveBeenCalledOnce()
        expect(result.status).not.toHaveBeenCalled()
    })

    it('responde 403 al personal de otro restaurante', () => {
        const result = runAuthorizeRestaurant({ id: 'm', role: 'manager', restaurantId: 'rest-B' })

        expect(result.status).toHaveBeenCalledWith(403)
        expect(result.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Forbidden' }))
        expect(result.next).not.toHaveBeenCalled()
    })

    it('responde 403 a un usuario no admin sin restaurantId', () => {
        const result = runAuthorizeRestaurant({ id: 'm', role: 'manager', restaurantId: null })

        expect(result.status).toHaveBeenCalledWith(403)
        expect(result.next).not.toHaveBeenCalled()
    })

    it('responde 403 si no hay usuario', () => {
        const result = runAuthorizeRestaurant(undefined)

        expect(result.status).toHaveBeenCalledWith(403)
        expect(result.next).not.toHaveBeenCalled()
    })

    it('responde 403 si la ruta no trae el parámetro del restaurante', () => {
        const result = runAuthorizeRestaurant({ id: 'm', role: 'manager', restaurantId: 'rest-A' }, {})

        expect(result.status).toHaveBeenCalledWith(403)
        expect(result.next).not.toHaveBeenCalled()
    })

    it('permite indicar el nombre del parámetro (por ejemplo id)', () => {
        const allowed = runAuthorizeRestaurant({ id: 'm', role: 'manager', restaurantId: 'rest-A' }, { id: 'rest-A' }, 'id')
        const denied = runAuthorizeRestaurant({ id: 'm', role: 'manager', restaurantId: 'rest-A' }, { id: 'rest-B' }, 'id')

        expect(allowed.next).toHaveBeenCalledOnce()
        expect(denied.status).toHaveBeenCalledWith(403)
    })
})

describe('restaurantScope', () => {
    const scope = (user: AuthRequest['user'], query: Record<string, unknown> = {}) =>
        restaurantScope({ user, params: {}, query } as unknown as AuthRequest)

    it('devuelve el restaurantId del token para el personal, ignorando la query', () => {
        expect(scope({ role: 'cocinero', restaurantId: 'rest-A' }, { restaurantId: 'rest-B' })).toBe('rest-A')
    })

    it('permite al admin elegir el restaurante por query', () => {
        expect(scope({ role: 'admin', restaurantId: null }, { restaurantId: 'rest-B' })).toBe('rest-B')
    })

    it('devuelve undefined si el admin no indica restaurante', () => {
        expect(scope({ role: 'admin', restaurantId: null })).toBeUndefined()
    })

    it('ignora una query que no sea un string', () => {
        expect(scope({ role: 'admin', restaurantId: null }, { restaurantId: ['a', 'b'] })).toBeUndefined()
    })
})
