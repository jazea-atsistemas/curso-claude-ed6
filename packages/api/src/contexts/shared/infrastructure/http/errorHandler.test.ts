import { describe, it, expect, vi } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { errorHandler } from './errorHandler.js'
import {
    TableNotFoundError,
    DuplicatedTableNumberError,
    TableNotAvailableError,
    TableOccupiedError,
    InvalidCapacityError,
    InvalidPeopleCountError,
    TableNumberRequiredError,
    RestaurantNotFoundError
} from '@errors/DomainErrors.js'

const run = (err: unknown) => {
    const json = vi.fn()
    const status = vi.fn().mockReturnValue({ json })
    const res = { status } as unknown as Response
    errorHandler(err, {} as Request, res, vi.fn() as unknown as NextFunction)
    return { status, json }
}

describe('errorHandler', () => {
    it('responde 404 con el nombre de la clase para TableNotFoundError', () => {
        const { status, json } = run(new TableNotFoundError())
        expect(status).toHaveBeenCalledWith(404)
        expect(json).toHaveBeenCalledWith({ error: 'TableNotFoundError', message: 'Table not found' })
    })

    it('responde 404 para RestaurantNotFoundError', () => {
        expect(run(new RestaurantNotFoundError()).status).toHaveBeenCalledWith(404)
    })

    it('responde 409 para los errores de conflicto', () => {
        for (const err of [new DuplicatedTableNumberError(7), new TableNotAvailableError(), new TableOccupiedError()]) {
            const { status, json } = run(err)
            expect(status).toHaveBeenCalledWith(409)
            expect(json).toHaveBeenCalledWith({ error: err.name, message: err.message })
        }
    })

    it('responde 400 para los errores de validación de mesa', () => {
        for (const err of [new TableNumberRequiredError(), new InvalidCapacityError(), new InvalidPeopleCountError()]) {
            expect(run(err).status).toHaveBeenCalledWith(400)
        }
    })

    it('responde 500 para errores que no son AppError', () => {
        const { status, json } = run(new Error('boom'))
        expect(status).toHaveBeenCalledWith(500)
        expect(json).toHaveBeenCalledWith({ error: 'InternalServerError', message: 'Something went wrong' })
    })
})
