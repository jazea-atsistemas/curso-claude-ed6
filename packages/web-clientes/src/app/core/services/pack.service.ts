import { Injectable, inject } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable } from 'rxjs'
import { API_URL } from '@resttek/web-shared'
import { Pack } from '../models/pack.model'

@Injectable({ providedIn: 'root' })
export class PackService {
  private readonly http = inject(HttpClient)
  private readonly apiUrl = inject(API_URL)

  getByRestaurant(restaurantId: string): Observable<Pack[]> {
    return this.http.get<Pack[]>(`${this.apiUrl}/public/restaurants/${restaurantId}/packs`)
  }
}
