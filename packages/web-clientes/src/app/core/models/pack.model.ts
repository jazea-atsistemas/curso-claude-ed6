/** Plato que se puede elegir en un hueco del pack. */
export interface PackOption {
  id: string
  name: string
  description: string | null
  price: number
}

export interface PackSlot {
  id: string
  name: string
  category: string
  options: PackOption[]
}

/** Pack de la carta pública: precio fijo y un plato a elegir en cada hueco. */
export interface Pack {
  id: string
  name: string
  description: string | null
  price: number
  slots: PackSlot[]
}

/** Plato elegido para un hueco, con los nombres para enseñarlo en el carrito. */
export interface PackChoice {
  slotId: string
  slotName: string
  dishId: string
  dishName: string
}
