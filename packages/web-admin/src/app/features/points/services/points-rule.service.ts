import { Injectable, inject } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { environment } from '../../../../environments/environment'
import type { PointsRule, SavePointsRuleDto } from '../models/points-rule.model'

@Injectable({ providedIn: 'root' })
export class PointsRuleService {
  private readonly http = inject(HttpClient)

  private buildUrl(restaurantId: string): string {
    return `${environment.apiUrl}/restaurants/${restaurantId}/points-rule`
  }

  // La API devuelve null si el restaurante no tiene regla
  get(restaurantId: string) {
    return this.http.get<PointsRule | null>(this.buildUrl(restaurantId))
  }

  save(restaurantId: string, dto: SavePointsRuleDto) {
    return this.http.put<PointsRule>(this.buildUrl(restaurantId), dto)
  }

  delete(restaurantId: string) {
    return this.http.delete<void>(this.buildUrl(restaurantId))
  }
}
