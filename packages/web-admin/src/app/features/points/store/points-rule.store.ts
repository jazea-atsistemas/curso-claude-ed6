import { Injectable, inject, signal } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { PointsRuleService } from '../services/points-rule.service'
import type { PointsRule, SavePointsRuleDto } from '../models/points-rule.model'

@Injectable({ providedIn: 'root' })
export class PointsRuleStore {
  private readonly service = inject(PointsRuleService)

  private readonly _rule = signal<PointsRule | null>(null)
  private readonly _loading = signal(false)
  private readonly _error = signal<string | null>(null)

  readonly rule = this._rule.asReadonly()
  readonly loading = this._loading.asReadonly()
  readonly error = this._error.asReadonly()

  private _currentRestaurantId: string | null = null

  async load(restaurantId: string): Promise<void> {
    // El store es global: al cambiar de restaurante se vacía para no mostrar la regla del anterior
    if (this._currentRestaurantId !== restaurantId) {
      this._rule.set(null)
    }
    this._currentRestaurantId = restaurantId
    this._loading.set(true)
    this._error.set(null)
    try {
      const rule = await firstValueFrom(this.service.get(restaurantId))
      // Si mientras tanto se ha pedido otro restaurante, se descarta esta respuesta
      if (this._currentRestaurantId !== restaurantId) return
      this._rule.set(rule)
    } catch (err: any) {
      if (this._currentRestaurantId !== restaurantId) return
      this._rule.set(null)
      this._error.set(
        err?.status === 403
          ? 'No tienes acceso a la regla de puntos de este restaurante.'
          : 'No se pudo cargar la regla de puntos.'
      )
    } finally {
      if (this._currentRestaurantId === restaurantId) {
        this._loading.set(false)
      }
    }
  }

  async save(restaurantId: string, dto: SavePointsRuleDto): Promise<void> {
    const rule = await firstValueFrom(this.service.save(restaurantId, dto))
    if (this._currentRestaurantId === restaurantId) {
      this._rule.set(rule)
    }
  }

  async remove(restaurantId: string): Promise<void> {
    await firstValueFrom(this.service.delete(restaurantId))
    if (this._currentRestaurantId === restaurantId) {
      this._rule.set(null)
    }
  }
}
