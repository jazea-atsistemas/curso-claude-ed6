import { describe, it, expect, beforeEach } from 'vitest'
import { PointsService } from './points.service.js'
import { MockPointsRepository } from '@repositories/mocks/MockPointsRepository.js'
import { MockRestaurantRepository } from '@repositories/mocks/MockRestaurantRepository.js'
import { InvalidPointsRuleError, RestaurantNotFoundError } from '@errors/DomainErrors.js'

const now = '2026-10-22T10:00:00.000Z'

describe('PointsService', () => {
    let pointsRepo: MockPointsRepository
    let restaurantRepo: MockRestaurantRepository
    let service: PointsService

    beforeEach(async () => {
        pointsRepo = new MockPointsRepository()
        restaurantRepo = new MockRestaurantRepository()
        service = new PointsService(pointsRepo, restaurantRepo)

        await restaurantRepo.save({
            id: 'rest-1', name: 'Rest 1', address: 'Calle 1', email: 'r1@test.com', phone: '600000000',
            ownerFirstName: 'Ana', ownerLastName: 'Pérez', logoUrl: null, createdAt: now, updatedAt: now
        })
    })

    describe('getRule', () => {
        it('devuelve null si el restaurante no tiene regla', async () => {
            expect(await service.getRule('rest-1')).toBeNull()
        })

        it('devuelve la regla configurada', async () => {
            await pointsRepo.saveRule({ restaurantId: 'rest-1', spendAmount: 10, pointsAwarded: 1, updatedAt: now })
            expect(await service.getRule('rest-1')).toMatchObject({ spendAmount: 10, pointsAwarded: 1 })
        })

        it('lanza RestaurantNotFoundError si el restaurante no existe', async () => {
            await expect(service.getRule('rest-x')).rejects.toThrow(RestaurantNotFoundError)
        })
    })

    describe('saveRule', () => {
        it('crea la regla y la guarda', async () => {
            const rule = await service.saveRule('rest-1', { spendAmount: 10, pointsAwarded: 2 })
            expect(rule).toMatchObject({ restaurantId: 'rest-1', spendAmount: 10, pointsAwarded: 2 })
            expect(rule.updatedAt).toBeTruthy()
            expect(await pointsRepo.findRule('rest-1')).toEqual(rule)
        })

        it('sustituye una regla existente', async () => {
            await service.saveRule('rest-1', { spendAmount: 10, pointsAwarded: 2 })
            await service.saveRule('rest-1', { spendAmount: 5.5, pointsAwarded: 1 })
            expect(await pointsRepo.findRule('rest-1')).toMatchObject({ spendAmount: 5.5, pointsAwarded: 1 })
        })

        it('rechaza un importe que no sea un número de al menos 0,01 €', async () => {
            for (const spendAmount of [undefined, 0, -1, 0.001, '10', NaN, Infinity]) {
                await expect(service.saveRule('rest-1', { spendAmount: spendAmount as any, pointsAwarded: 1 }))
                    .rejects.toThrow(InvalidPointsRuleError)
            }
        })

        it('rechaza unos puntos que no sean un entero >= 1', async () => {
            for (const pointsAwarded of [undefined, 0, -1, 1.5, '1']) {
                await expect(service.saveRule('rest-1', { spendAmount: 10, pointsAwarded: pointsAwarded as any }))
                    .rejects.toThrow(InvalidPointsRuleError)
            }
        })

        it('lanza RestaurantNotFoundError si el restaurante no existe', async () => {
            await expect(service.saveRule('rest-x', { spendAmount: 10, pointsAwarded: 1 })).rejects.toThrow(RestaurantNotFoundError)
        })
    })

    describe('deleteRule', () => {
        it('borra la regla del restaurante', async () => {
            await service.saveRule('rest-1', { spendAmount: 10, pointsAwarded: 1 })
            await service.deleteRule('rest-1')
            expect(await pointsRepo.findRule('rest-1')).toBeNull()
        })

        it('lanza RestaurantNotFoundError si el restaurante no existe', async () => {
            await expect(service.deleteRule('rest-x')).rejects.toThrow(RestaurantNotFoundError)
        })
    })

    describe('awardPoints', () => {
        it('suma floor(importe / X) * Y al saldo del cliente en ese restaurante', async () => {
            await service.saveRule('rest-1', { spendAmount: 10, pointsAwarded: 2 })

            expect(await service.awardPoints('client-1', 'rest-1', 34)).toEqual({ pointsEarned: 6, balance: 6 })
            expect(await service.awardPoints('client-1', 'rest-1', 10)).toEqual({ pointsEarned: 2, balance: 8 })
            expect(await service.getClientBalance('client-1', 'rest-1')).toBe(8)
        })

        it('no da puntos si el restaurante no tiene regla, pero devuelve el saldo actual', async () => {
            await pointsRepo.addToBalance('client-1', 'rest-1', 5, now)
            expect(await service.awardPoints('client-1', 'rest-1', 100)).toEqual({ pointsEarned: 0, balance: 5 })
        })

        it('no crea saldo si no se gana ningún punto', async () => {
            await service.saveRule('rest-1', { spendAmount: 10, pointsAwarded: 1 })
            expect(await service.awardPoints('client-1', 'rest-1', 9.99)).toEqual({ pointsEarned: 0, balance: 0 })
            expect(await pointsRepo.findBalance('client-1', 'rest-1')).toBeNull()
        })
    })

    describe('calculatePointsFor y addPoints', () => {
        it('calculatePointsFor aplica la regla del restaurante sin tocar el saldo', async () => {
            await service.saveRule('rest-1', { spendAmount: 10, pointsAwarded: 3 })
            expect(await service.calculatePointsFor('rest-1', 25)).toBe(6)
            expect(await service.calculatePointsFor('rest-2', 25)).toBe(0)
            expect(await pointsRepo.findBalance('client-1', 'rest-1')).toBeNull()
        })

        it('addPoints suma (o resta) y devuelve el saldo nuevo', async () => {
            expect(await service.addPoints('client-1', 'rest-1', 10)).toBe(10)
            expect(await service.addPoints('client-1', 'rest-1', -4)).toBe(6)
            expect(await service.addPoints('client-1', 'rest-1', 0)).toBe(6)
        })
    })

    describe('saldos del cliente', () => {
        it('getClientBalance devuelve 0 si el cliente no tiene puntos', async () => {
            expect(await service.getClientBalance('client-1', 'rest-1')).toBe(0)
        })

        it('getClientBalances lista solo los saldos de ese cliente', async () => {
            await pointsRepo.addToBalance('client-1', 'rest-1', 5, now)
            await pointsRepo.addToBalance('client-2', 'rest-1', 7, now)
            const balances = await service.getClientBalances('client-1')
            expect(balances).toHaveLength(1)
            expect(balances[0]).toMatchObject({ restaurantId: 'rest-1', balance: 5 })
        })
    })
})
