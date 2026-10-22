import { Injectable, inject, signal } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { TableService } from '../services/table.service'
import type { Table, CreateTableDto, UpdateTableDto } from '../models/table.model'

@Injectable({ providedIn: 'root' })
export class TableStore {
  private readonly service = inject(TableService)

  private readonly _tables = signal<Table[]>([])
  private readonly _loading = signal(false)
  private readonly _error = signal<string | null>(null)

  readonly tables = this._tables.asReadonly()
  readonly loading = this._loading.asReadonly()
  readonly error = this._error.asReadonly()

  private _currentRestaurantId: string | null = null

  async loadByRestaurant(restaurantId: string): Promise<void> {
    // El store es global: al cambiar de restaurante se vacía la lista para no mostrar datos del anterior
    if (this._currentRestaurantId !== restaurantId) {
      this._tables.set([])
    }
    this._currentRestaurantId = restaurantId
    this._loading.set(true)
    this._error.set(null)
    try {
      const data = await firstValueFrom(this.service.getAll(restaurantId))
      // Si mientras tanto se ha pedido otro restaurante, se descarta esta respuesta
      if (this._currentRestaurantId !== restaurantId) return
      this._tables.set(data)
    } catch (err: any) {
      if (this._currentRestaurantId !== restaurantId) return
      this._tables.set([])
      this._error.set(
        err?.status === 403
          ? 'No tienes acceso a las mesas de este restaurante.'
          : 'No se pudieron cargar las mesas.'
      )
    } finally {
      if (this._currentRestaurantId === restaurantId) {
        this._loading.set(false)
      }
    }
  }

  async create(restaurantId: string, dto: CreateTableDto): Promise<void> {
    const table = await firstValueFrom(this.service.create(restaurantId, dto))
    this._tables.update(list => [...list, table].sort((a, b) => a.number - b.number))
  }

  async update(restaurantId: string, id: string, dto: UpdateTableDto): Promise<void> {
    const updated = await firstValueFrom(this.service.update(restaurantId, id, dto))
    this._tables.update(list =>
      list.map(t => t.id === id ? updated : t).sort((a, b) => a.number - b.number)
    )
  }

  async delete(restaurantId: string, id: string): Promise<void> {
    await firstValueFrom(this.service.delete(restaurantId, id))
    this._tables.update(list => list.filter(t => t.id !== id))
  }
}
