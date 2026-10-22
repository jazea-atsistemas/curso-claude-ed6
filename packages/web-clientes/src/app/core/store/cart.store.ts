import { Injectable, signal, computed } from '@angular/core'
import { SelectedTable } from '../models/table.model'
import { Pack, PackChoice } from '../models/pack.model'

const TABLE_KEY = 'resttek.table'

export interface Dish {
  id: string
  name: string
  description: string | null
  price: number
  category: string
  available: boolean
  restaurantId: string
  ingredients: { ingredientId: string; quantity: number }[]
}

export interface CartItem {
  dish: Dish
  quantity: number
  notes: string
}

/** Un pack con los platos elegidos. Dos packs iguales con distinta elección son líneas distintas. */
export interface CartPack {
  key: string
  packId: string
  name: string
  price: number
  choices: PackChoice[]
  quantity: number
}

@Injectable({ providedIn: 'root' })
export class CartStore {
  private readonly _items = signal<CartItem[]>([])
  private readonly _packs = signal<CartPack[]>([])
  private readonly _restaurantId = signal<string | null>(null)

  private readonly _table = signal<SelectedTable | null>(this.loadTable())

  readonly table = this._table.asReadonly()
  readonly items = this._items.asReadonly()
  readonly packs = this._packs.asReadonly()
  readonly restaurantId = this._restaurantId.asReadonly()

  readonly total = computed(() =>
    this._items().reduce((sum, item) => sum + item.dish.price * item.quantity, 0) +
    this._packs().reduce((sum, pack) => sum + pack.price * pack.quantity, 0)
  )

  readonly itemCount = computed(() =>
    this._items().reduce((count, item) => count + item.quantity, 0) +
    this._packs().reduce((count, pack) => count + pack.quantity, 0)
  )

  readonly isEmpty = computed(() => this._items().length === 0 && this._packs().length === 0)

  addItem(dish: Dish, quantity: number = 1, notes: string = ''): void {
    this.switchRestaurant(dish.restaurantId)

    const existingIndex = this._items().findIndex(
      item => item.dish.id === dish.id && item.notes === notes
    )

    if (existingIndex >= 0) {
      const items = [...this._items()]
      items[existingIndex] = {
        ...items[existingIndex],
        quantity: items[existingIndex].quantity + quantity
      }
      this._items.set(items)
    } else {
      this._items.update(items => [...items, { dish, quantity, notes }])
    }
  }

  removeItem(dishId: string): void {
    this._items.update(items => items.filter(item => item.dish.id !== dishId))
    this.resetRestaurantIfEmpty()
  }

  addPack(restaurantId: string, pack: Pack, choices: PackChoice[], quantity: number = 1): void {
    this.switchRestaurant(restaurantId)
    const key = pack.id + '|' + choices.map(c => c.dishId).join(',')
    const existing = this._packs().find(p => p.key === key)
    if (existing) {
      this.updatePackQuantity(key, existing.quantity + quantity)
    } else {
      this._packs.update(packs => [...packs, { key, packId: pack.id, name: pack.name, price: pack.price, choices, quantity }])
    }
  }

  removePack(key: string): void {
    this._packs.update(packs => packs.filter(p => p.key !== key))
    this.resetRestaurantIfEmpty()
  }

  updatePackQuantity(key: string, quantity: number): void {
    if (quantity <= 0) {
      this.removePack(key)
      return
    }
    this._packs.update(packs => packs.map(p => p.key === key ? { ...p, quantity } : p))
  }

  /** El carrito es de un solo restaurante: al añadir de otro se vacía. */
  private switchRestaurant(restaurantId: string): void {
    if (this._restaurantId() && this._restaurantId() !== restaurantId) {
      this._items.set([])
      this._packs.set([])
    }
    this._restaurantId.set(restaurantId)
  }

  private resetRestaurantIfEmpty(): void {
    if (this.isEmpty()) {
      this._restaurantId.set(null)
    }
  }

  updateQuantity(dishId: string, quantity: number): void {
    if (quantity <= 0) {
      this.removeItem(dishId)
      return
    }
    const items = this._items().map(item =>
      item.dish.id === dishId ? { ...item, quantity } : item
    )
    this._items.set(items)
  }

  clear(): void {
    this._items.set([])
    this._packs.set([])
    this._restaurantId.set(null)
  }

  /** Mesa guardada para ese restaurante, o null si no hay o es de otro. */
  tableFor(restaurantId: string): SelectedTable | null {
    const table = this._table()
    return table && table.restaurantId === restaurantId ? table : null
  }

  setTable(table: SelectedTable): void {
    this._table.set(table)
    try {
      sessionStorage.setItem(TABLE_KEY, JSON.stringify(table))
    } catch {
      // sessionStorage no disponible: la mesa solo vive en memoria
    }
  }

  clearTable(): void {
    this._table.set(null)
    try {
      sessionStorage.removeItem(TABLE_KEY)
    } catch {
      // nada que limpiar
    }
  }

  private loadTable(): SelectedTable | null {
    try {
      const raw = sessionStorage.getItem(TABLE_KEY)
      return raw ? (JSON.parse(raw) as SelectedTable) : null
    } catch {
      return null
    }
  }
}
