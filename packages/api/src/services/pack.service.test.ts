import { describe, it, expect, beforeEach } from 'vitest'
import { PackService, type PackDTO } from './pack.service.js'
import { MockPackRepository } from '@repositories/mocks/MockPackRepository.js'
import { MockDishRepository } from '@repositories/mocks/MockDishRepository.js'
import { MockRestaurantRepository } from '@repositories/mocks/MockRestaurantRepository.js'
import type { Dish, DishCategoryType } from '@models/dish.model.js'
import {
    RestaurantNotFoundError,
    PackNotFoundError,
    PackNameRequiredError,
    InvalidPriceError,
    PackSlotsRequiredError,
    InvalidCategoryError,
    InvalidPackRestrictionError,
    InvalidPackSlotDishError,
    PackNotActiveError,
    InvalidPackSelectionError
} from '@errors/DomainErrors.js'

const now = '2026-10-22T10:00:00.000Z'

const dish = (id: string, category: DishCategoryType, restaurantId = 'rest-1', available = true): Dish => ({
    id,
    name: `Plato ${id}`,
    description: null,
    price: 5,
    category,
    available,
    restaurantId,
    ingredients: [],
    createdAt: now,
    updatedAt: now
})

const menuDTO = (overrides: Partial<PackDTO> = {}): PackDTO => ({
    name: 'Menú del día',
    description: 'Entrante, principal y bebida',
    price: 20,
    active: true,
    slots: [
        { name: 'Entrante', category: 'entrante' },
        { name: 'Principal', category: 'principal' },
        { name: 'Bebida', category: 'bebida', restriction: 'bloquear', dishIds: ['cerveza'] }
    ],
    ...overrides
})

describe('PackService', () => {
    let packRepo: MockPackRepository
    let dishRepo: MockDishRepository
    let restaurantRepo: MockRestaurantRepository
    let service: PackService

    beforeEach(async () => {
        packRepo = new MockPackRepository()
        dishRepo = new MockDishRepository()
        restaurantRepo = new MockRestaurantRepository()
        service = new PackService(packRepo, dishRepo, restaurantRepo)

        for (const id of ['rest-1', 'rest-2']) {
            await restaurantRepo.save({
                id, name: `Rest ${id}`, address: 'Calle 1', email: `${id}@test.com`, phone: '600000000',
                ownerFirstName: 'Ana', ownerLastName: 'Pérez', logoUrl: null, createdAt: now, updatedAt: now
            })
        }
        for (const d of [
            dish('ensalada', 'entrante'),
            dish('sopa', 'entrante', 'rest-1', false),
            dish('pizza', 'principal'),
            dish('agua', 'bebida'),
            dish('cerveza', 'bebida'),
            dish('tarta', 'postre'),
            dish('limonada', 'bebida', 'rest-2')
        ]) {
            await dishRepo.save(d)
        }
    })

    describe('create', () => {
        it('should create a pack with ordered slots and default values', async () => {
            const pack = await service.create('rest-1', menuDTO({ description: '  ', active: undefined as any }))
            expect(pack).toMatchObject({ restaurantId: 'rest-1', name: 'Menú del día', description: null, price: 20, active: true })
            expect(pack.slots.map(s => [s.name, s.category, s.restriction, s.dishIds])).toEqual([
                ['Entrante', 'entrante', 'bloquear', []],
                ['Principal', 'principal', 'bloquear', []],
                ['Bebida', 'bebida', 'bloquear', ['cerveza']]
            ])
            expect(new Set(pack.slots.map(s => s.id)).size).toBe(3)
            expect(await packRepo.findById(pack.id, 'rest-1')).toEqual(pack)
        })

        it('should default the slot name to the capitalized category', async () => {
            const pack = await service.create('rest-1', menuDTO({ slots: [{ category: ' Bebida ' }] }))
            expect(pack.slots[0]).toMatchObject({ name: 'Bebida', category: 'bebida' })
        })

        it('should throw RestaurantNotFoundError for an unknown restaurant', async () => {
            await expect(service.create('rest-x', menuDTO())).rejects.toThrow(RestaurantNotFoundError)
        })

        it('should validate name, price and slots', async () => {
            await expect(service.create('rest-1', menuDTO({ name: ' ' }))).rejects.toThrow(PackNameRequiredError)
            for (const price of [0, -3, undefined, '20']) {
                await expect(service.create('rest-1', menuDTO({ price: price as any }))).rejects.toThrow(InvalidPriceError)
            }
            await expect(service.create('rest-1', menuDTO({ slots: [] }))).rejects.toThrow(PackSlotsRequiredError)
            await expect(service.create('rest-1', menuDTO({ slots: undefined as any }))).rejects.toThrow(PackSlotsRequiredError)
        })

        it('should validate slot category and restriction', async () => {
            await expect(service.create('rest-1', menuDTO({ slots: [{ category: 'cafe' }] }))).rejects.toThrow(InvalidCategoryError)
            await expect(service.create('rest-1', menuDTO({ slots: [{ category: 'bebida', restriction: 'todos' }] }))).rejects.toThrow(InvalidPackRestrictionError)
        })

        it('should reject listed dishes that are unknown, from another restaurant or of another category', async () => {
            for (const dishIds of [['nope'], ['limonada'], ['pizza']]) {
                await expect(service.create('rest-1', menuDTO({ slots: [{ category: 'bebida', dishIds }] }))).rejects.toThrow(InvalidPackSlotDishError)
            }
        })

        it('should require at least one dish in permitir mode', async () => {
            await expect(service.create('rest-1', menuDTO({ slots: [{ category: 'bebida', restriction: 'permitir', dishIds: [] }] })))
                .rejects.toThrow(InvalidPackSlotDishError)
        })

        it('should remove duplicated dish ids', async () => {
            const pack = await service.create('rest-1', menuDTO({ slots: [{ category: 'bebida', restriction: 'permitir', dishIds: ['agua', 'agua'] }] }))
            expect(pack.slots[0]?.dishIds).toEqual(['agua'])
        })
    })

    describe('update / delete / getById', () => {
        it('should update a pack keeping id and createdAt', async () => {
            const created = await service.create('rest-1', menuDTO())
            const updated = await service.update(created.id, 'rest-1', menuDTO({ name: 'Menú noche', price: 25, active: false, slots: [{ category: 'principal' }] }))
            expect(updated).toMatchObject({ id: created.id, createdAt: created.createdAt, name: 'Menú noche', price: 25, active: false })
            expect(updated.slots).toHaveLength(1)
        })

        it('should throw PackNotFoundError for a pack of another restaurant', async () => {
            const created = await service.create('rest-1', menuDTO())
            await expect(service.getById(created.id, 'rest-2')).rejects.toThrow(PackNotFoundError)
            await expect(service.update(created.id, 'rest-2', menuDTO())).rejects.toThrow(PackNotFoundError)
            await expect(service.delete(created.id, 'rest-2')).rejects.toThrow(PackNotFoundError)
        })

        it('should delete a pack', async () => {
            const created = await service.create('rest-1', menuDTO())
            await service.delete(created.id, 'rest-1')
            expect(await service.findByRestaurantId('rest-1')).toEqual([])
        })
    })

    describe('listPublic', () => {
        it('should list only active packs with the choosable dishes of each slot', async () => {
            const menu = await service.create('rest-1', menuDTO())
            await service.create('rest-1', menuDTO({ name: 'Inactivo', active: false }))

            const packs = await service.listPublic('rest-1')
            expect(packs).toHaveLength(1)
            expect(packs[0]).toMatchObject({ id: menu.id, name: 'Menú del día', price: 20 })
            expect(packs[0]!.slots.map(s => [s.name, s.options.map(o => o.id)])).toEqual([
                ['Entrante', ['ensalada']],
                ['Principal', ['pizza']],
                ['Bebida', ['agua']]
            ])
            expect(packs[0]!.slots[0]!.options[0]).toEqual({ id: 'ensalada', name: 'Plato ensalada', description: null, price: 5 })
        })

        it('should hide packs with a slot that has nothing to choose', async () => {
            await service.create('rest-1', menuDTO({ slots: [{ category: 'bebida', restriction: 'bloquear', dishIds: ['agua', 'cerveza'] }] }))
            expect(await service.listPublic('rest-1')).toEqual([])
        })
    })

    describe('resolveSelection', () => {
        let packId: string
        let slotIds: string[]

        beforeEach(async () => {
            const pack = await service.create('rest-1', menuDTO())
            packId = pack.id
            slotIds = pack.slots.map(s => s.id)
        })

        const selections = (entrante: string, principal: string, bebida: string) => [
            { slotId: slotIds[2]!, dishId: bebida },
            { slotId: slotIds[0]!, dishId: entrante },
            { slotId: slotIds[1]!, dishId: principal }
        ]

        it('should return the pack and the chosen dishes in slot order', async () => {
            const result = await service.resolveSelection('rest-1', packId, selections('ensalada', 'pizza', 'agua'))
            expect(result.pack.id).toBe(packId)
            expect(result.dishIds).toEqual(['ensalada', 'pizza', 'agua'])
        })

        it('should throw PackNotFoundError for an unknown pack or another restaurant', async () => {
            await expect(service.resolveSelection('rest-1', 'nope', [])).rejects.toThrow(PackNotFoundError)
            await expect(service.resolveSelection('rest-2', packId, [])).rejects.toThrow(PackNotFoundError)
        })

        it('should throw PackNotActiveError for an inactive pack', async () => {
            await service.update(packId, 'rest-1', menuDTO({ active: false }))
            await expect(service.resolveSelection('rest-1', packId, [])).rejects.toThrow(PackNotActiveError)
        })

        it('should reject a blocked, unavailable, foreign or wrong-category dish', async () => {
            for (const sel of [
                selections('ensalada', 'pizza', 'cerveza'),
                selections('sopa', 'pizza', 'agua'),
                selections('ensalada', 'pizza', 'limonada'),
                selections('ensalada', 'tarta', 'agua'),
                selections('ensalada', 'pizza', 'nope')
            ]) {
                await expect(service.resolveSelection('rest-1', packId, sel)).rejects.toThrow(InvalidPackSelectionError)
            }
        })

        it('should require exactly one choice per slot', async () => {
            const full = selections('ensalada', 'pizza', 'agua')
            await expect(service.resolveSelection('rest-1', packId, full.slice(1))).rejects.toThrow(InvalidPackSelectionError)
            await expect(service.resolveSelection('rest-1', packId, [...full, full[0]!])).rejects.toThrow(InvalidPackSelectionError)
            await expect(service.resolveSelection('rest-1', packId, [...full, { slotId: 'otro', dishId: 'agua' }])).rejects.toThrow(InvalidPackSelectionError)
            await expect(service.resolveSelection('rest-1', packId, undefined as any)).rejects.toThrow(InvalidPackSelectionError)
        })
    })
})
