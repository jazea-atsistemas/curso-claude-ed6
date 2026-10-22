import { InvalidPackRestrictionError } from '@errors/DomainErrors.js'
import type { Dish, DishCategoryType } from '@models/dish.model.js'

// 'bloquear': se pueden elegir todos los platos de la categoría salvo los de dishIds.
// 'permitir': solo se pueden elegir los platos de dishIds.
const VALID_PACK_RESTRICTIONS = ['bloquear', 'permitir'] as const

export type PackRestrictionType = typeof VALID_PACK_RESTRICTIONS[number]

export interface PackSlot {
    id: string
    name: string
    category: DishCategoryType
    restriction: PackRestrictionType
    dishIds: string[]
}

export interface Pack {
    id: string
    restaurantId: string
    name: string
    description: string | null
    price: number
    active: boolean
    slots: PackSlot[]
    createdAt: string
    updatedAt: string
}

export function normalizePackRestriction(value: string): PackRestrictionType {
    const normalized = typeof value === 'string' ? value.toLowerCase().trim() : ''
    if (!VALID_PACK_RESTRICTIONS.includes(normalized as PackRestrictionType)) {
        throw new InvalidPackRestrictionError(`Restricción inválida: ${value}. Debe ser una de: ${VALID_PACK_RESTRICTIONS.join(', ')}`)
    }
    return normalized as PackRestrictionType
}

// Un plato se puede elegir en un hueco si es de su categoría, está disponible
// y la lista de permitidos/bloqueados del hueco no lo excluye.
export function isDishAllowedInSlot(slot: PackSlot, dish: Pick<Dish, 'id' | 'category' | 'available'>): boolean {
    if (dish.category !== slot.category || !dish.available) return false
    const listed = slot.dishIds.includes(dish.id)
    return slot.restriction === 'permitir' ? listed : !listed
}

export function allowedDishesForSlot<T extends Pick<Dish, 'id' | 'category' | 'available'>>(slot: PackSlot, dishes: T[]): T[] {
    return dishes.filter(dish => isDishAllowedInSlot(slot, dish))
}
