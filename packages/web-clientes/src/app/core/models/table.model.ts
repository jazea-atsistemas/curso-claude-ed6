export interface PublicTable {
  id: string
  number: number
  description: string | null
  capacity: number
}

export interface OccupiedTable {
  id: string
  restaurantId: string
  number: number
  description: string | null
  capacity: number
  status: string
}

/** Mesa elegida por el cliente, guardada en sessionStorage. */
export interface SelectedTable {
  restaurantId: string
  tableId: string
  number: number
  people: number
}
