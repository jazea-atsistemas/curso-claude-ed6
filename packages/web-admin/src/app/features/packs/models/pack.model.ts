import type { DishCategory } from '../../dishes/models/dish.model'

// 'bloquear': todos los platos de la categoría menos los marcados.
// 'permitir': solo los platos marcados.
export type PackRestriction = 'bloquear' | 'permitir'

export interface PackSlot {
  id: string
  name: string
  category: DishCategory
  restriction: PackRestriction
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

export interface PackSlotDto {
  name: string
  category: DishCategory
  restriction: PackRestriction
  dishIds: string[]
}

export interface PackDto {
  name: string
  description: string | null
  price: number
  active: boolean
  slots: PackSlotDto[]
}
