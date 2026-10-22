import { Injectable, inject, signal } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { PackService } from '../services/pack.service'
import type { Pack, PackDto } from '../models/pack.model'

const byName = (a: Pack, b: Pack) => a.name.localeCompare(b.name)

@Injectable({ providedIn: 'root' })
export class PackStore {
  private readonly service = inject(PackService)

  private readonly _packs = signal<Pack[]>([])
  private readonly _loading = signal(false)
  private readonly _error = signal<string | null>(null)

  readonly packs = this._packs.asReadonly()
  readonly loading = this._loading.asReadonly()
  readonly error = this._error.asReadonly()

  private _currentRestaurantId: string | null = null

  async loadByRestaurant(restaurantId: string): Promise<void> {
    // El store es global: al cambiar de restaurante se vacía la lista para no mostrar datos del anterior
    if (this._currentRestaurantId !== restaurantId) {
      this._packs.set([])
    }
    this._currentRestaurantId = restaurantId
    this._loading.set(true)
    this._error.set(null)
    try {
      const data = await firstValueFrom(this.service.getAll(restaurantId))
      // Si mientras tanto se ha pedido otro restaurante, se descarta esta respuesta
      if (this._currentRestaurantId !== restaurantId) return
      this._packs.set(data)
    } catch (err: any) {
      if (this._currentRestaurantId !== restaurantId) return
      this._packs.set([])
      this._error.set(
        err?.status === 403
          ? 'No tienes acceso a los packs de este restaurante.'
          : 'No se pudieron cargar los packs.'
      )
    } finally {
      if (this._currentRestaurantId === restaurantId) {
        this._loading.set(false)
      }
    }
  }

  async create(restaurantId: string, dto: PackDto): Promise<void> {
    const pack = await firstValueFrom(this.service.create(restaurantId, dto))
    this._packs.update(list => [...list, pack].sort(byName))
  }

  async update(restaurantId: string, id: string, dto: PackDto): Promise<void> {
    const updated = await firstValueFrom(this.service.update(restaurantId, id, dto))
    this._packs.update(list => list.map(p => p.id === id ? updated : p).sort(byName))
  }

  async delete(restaurantId: string, id: string): Promise<void> {
    await firstValueFrom(this.service.delete(restaurantId, id))
    this._packs.update(list => list.filter(p => p.id !== id))
  }
}
