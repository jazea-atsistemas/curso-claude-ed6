import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { JWT_SECRET, JWT_ISSUER, JWT_AUDIENCE } from '@config/env.js'

export interface AuthRequest extends Request {
    user?: any
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized: No token provided' })
        return
    }

    const tokenParts = authHeader.split(' ')
    const token = tokenParts[1]
    if (!token) {
        res.status(401).json({ error: 'Unauthorized: Malformed token' })
        return
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET, {
            algorithms: ['HS256'],
            issuer: JWT_ISSUER,
            audience: JWT_AUDIENCE
        })
        req.user = decoded
        next()
    } catch {
        res.status(401).json({ error: 'Unauthorized: Invalid token' })
    }
}

export const authorize = (roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (!req.user || !roles.includes(req.user.role)) {
            res.status(403).json({ error: 'Forbidden: Insufficient permissions' })
            return
        }
        next()
    }
}

export const authorizeRestaurant = (paramName = 'restaurantId') => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        const user = req.user
        if (user?.role === 'admin') {
            next()
            return
        }
        const target = req.params[paramName]
        if (!user || !user.restaurantId || user.restaurantId !== target) {
            res.status(403).json({ error: 'Forbidden', message: 'No tienes acceso a este restaurante' })
            return
        }
        next()
    }
}

export const restaurantScope = (req: AuthRequest): string | undefined => {
    if (req.user?.role === 'admin') {
        const requested = req.params.restaurantId ?? req.query.restaurantId
        return typeof requested === 'string' ? requested : undefined
    }
    return req.user?.restaurantId ?? undefined
}
