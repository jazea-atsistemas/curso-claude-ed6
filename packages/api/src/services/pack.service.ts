import { randomUUID } from 'crypto'
import type { Pack, PackSlot } from '@models/pack.model.js'
import { normalizePackRestriction, isDishAllowedInSlot, allowedDishesForSlot } from '@models/pack.model.js'
import type { Dish } from '@models/dish.model.js'
import { normalizeDishCategory } from '@models/dish.model.js'
import type { PackRepository } from '@repositories/pack.repository.js'
import type { DishRepository } from '@repositories/dish.repository.js'
import type { RestaurantRepository } from '@repositories/restaurant.repository.js'
import {
    RestaurantNotFoundError,
    PackNotFoundError,
    PackNameRequiredError,
    InvalidPriceError,
    PackSlotsRequiredError,
    InvalidPackSlotDishError,
    PackNotActiveError,
    InvalidPackSelectionError
} from '@errors/DomainErrors.js'

export interface PackSlotDTO {
    name?: string | null
    category: string
    restriction?: string
    dishIds?: string[]
}

export interface PackDTO {
    name: string
    description?: string | null
    price: number
    active?: boolean
    slots: PackSlotDTO[]
}

export interface PackSelection {
    slotId: string
    dishId: string
}

export interface PublicPackOption {
    id: string
    name: string
    description: string | null
    price: number
}

export interface PublicPack {
    id: string
    name: string
    description: string | null
    price: number
    slots: { id: string; name: string; category: string; options: PublicPackOption[] }[]
}

export interface ResolvedPackSelection {
    pack: Pack
    // Un plato por hueco, en el orden de los huecos del pack
    dishIds: string[]
}

// Lo que necesita OrderService para validar un pack pedido por un cliente
export interface PackSelectionResolver {
    resolveSelection(restaurantId: string, packId: string, selections: PackSelection[]): Promise<ResolvedPackSelection>
}

export class PackService implements PackSelectionResolver {
    constructor(
        private readonly packRepository: PackRepository,
        private readonly dishRepository: DishRepository,
        private readonly restaurantRepository: RestaurantRepository
    ) {}

    async create(restaurantId: string, dto: PackDTO): Promise<Pack> {
        const restaurant = await this.restaurantRepository.findById(restaurantId)
        if (!restaurant) {
            throw new RestaurantNotFoundError()
        }

        const now = new Date().toISOString()
        const pack = await this.buildPack({ id: randomUUID(), restaurantId, createdAt: now, updatedAt: now }, dto)
        await this.packRepository.save(pack)
        return pack
    }

    async update(id: string, restaurantId: string, dto: PackDTO): Promise<Pack> {
        const existing = await this.getById(id, restaurantId)
        const pack = await this.buildPack(
            { id: existing.id, restaurantId, createdAt: existing.createdAt, updatedAt: new Date().toISOString() },
            dto
        )
        await this.packRepository.save(pack)
        return pack
    }

    async delete(id: string, restaurantId: string): Promise<void> {
        await this.getById(id, restaurantId)
        await this.packRepository.delete(id, restaurantId)
    }

    async getById(id: string, restaurantId: string): Promise<Pack> {
        const pack = await this.packRepository.findById(id, restaurantId)
        if (!pack) {
            throw new PackNotFoundError()
        }
        return pack
    }

    async findByRestaurantId(restaurantId: string): Promise<Pack[]> {
        return this.packRepository.findByRestaurantId(restaurantId)
    }

    // Carta pública: packs activos con los platos que se pueden elegir en cada hueco.
    // Un pack con algún hueco sin opciones no se puede pedir, así que no se muestra.
    async listPublic(restaurantId: string): Promise<PublicPack[]> {
        const [packs, dishes] = await Promise.all([
            this.packRepository.findByRestaurantId(restaurantId),
            this.dishRepository.findByRestaurantId(restaurantId)
        ])

        return packs
            .filter(pack => pack.active)
            .map(pack => ({
                id: pack.id,
                name: pack.name,
                description: pack.description,
                price: pack.price,
                slots: pack.slots.map(slot => ({
                    id: slot.id,
                    name: slot.name,
                    category: slot.category,
                    options: allowedDishesForSlot(slot, dishes).map(d => ({
                        id: d.id,
                        name: d.name,
                        description: d.description,
                        price: d.price
                    }))
                }))
            }))
            .filter(pack => pack.slots.every(slot => slot.options.length > 0))
    }

    async resolveSelection(restaurantId: string, packId: string, selections: PackSelection[]): Promise<ResolvedPackSelection> {
        const pack = await this.getById(packId, restaurantId)
        if (!pack.active) {
            throw new PackNotActiveError()
        }
        if (!Array.isArray(selections) || selections.length !== pack.slots.length) {
            throw new InvalidPackSelectionError(`El pack "${pack.name}" necesita exactamente una elección por hueco (${pack.slots.length})`)
        }

        const dishIds: string[] = []
        for (const slot of pack.slots) {
            const chosen = selections.filter(s => s?.slotId === slot.id)
            if (chosen.length !== 1) {
                throw new InvalidPackSelectionError(`Elige un único plato para "${slot.name}"`)
            }
            const dish = await this.dishRepository.findById(chosen[0]!.dishId)
            if (!dish || dish.restaurantId !== restaurantId || !isDishAllowedInSlot(slot, dish)) {
                throw new InvalidPackSelectionError(`El plato elegido no está permitido en "${slot.name}"`)
            }
            dishIds.push(dish.id)
        }
        return { pack, dishIds }
    }

    private async buildPack(
        base: { id: string; restaurantId: string; createdAt: string; updatedAt: string },
        dto: PackDTO
    ): Promise<Pack> {
        if (typeof dto.name !== 'string' || dto.name.trim() === '') {
            throw new PackNameRequiredError()
        }
        if (typeof dto.price !== 'number' || !Number.isFinite(dto.price) || dto.price <= 0) {
            throw new InvalidPriceError()
        }
        if (!Array.isArray(dto.slots) || dto.slots.length === 0) {
            throw new PackSlotsRequiredError()
        }

        const dishes = new Map((await this.dishRepository.findByRestaurantId(base.restaurantId)).map(d => [d.id, d]))
        const slots = dto.slots.map(slotDTO => this.buildSlot(slotDTO, dishes))

        const description = typeof dto.description === 'string' && dto.description.trim() !== ''
            ? dto.description.trim()
            : null

        return {
            id: base.id,
            restaurantId: base.restaurantId,
            name: dto.name.trim(),
            description,
            price: dto.price,
            active: dto.active !== false,
            slots,
            createdAt: base.createdAt,
            updatedAt: base.updatedAt
        }
    }

    private buildSlot(dto: PackSlotDTO, dishes: Map<string, Dish>): PackSlot {
        const category = normalizeDishCategory(typeof dto?.category === 'string' ? dto.category : '')
        const restriction = normalizePackRestriction(dto.restriction ?? 'bloquear')
        const dishIds = [...new Set(Array.isArray(dto.dishIds) ? dto.dishIds : [])]

        for (const dishId of dishIds) {
            const dish = dishes.get(dishId)
            if (!dish || dish.category !== category) {
                throw new InvalidPackSlotDishError(`El plato ${dishId} no es un/a ${category} de este restaurante`)
            }
        }
        if (restriction === 'permitir' && dishIds.length === 0) {
            throw new InvalidPackSlotDishError(`El hueco de ${category} debe permitir al menos un plato`)
        }

        const name = typeof dto.name === 'string' && dto.name.trim() !== ''
            ? dto.name.trim()
            : category.charAt(0).toUpperCase() + category.slice(1)

        return { id: randomUUID(), name, category, restriction, dishIds }
    }
}
