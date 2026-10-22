import { Injectable, inject } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable } from 'rxjs'
import { API_URL } from '@resttek/web-shared'
import { ClientPoints } from '../models/points.model'

@Injectable({ providedIn: 'root' })
export class PointsService {
  private readonly http = inject(HttpClient)
  private readonly apiUrl = inject(API_URL)

  getMyPoints(): Observable<ClientPoints[]> {
    return this.http.get<ClientPoints[]>(`${this.apiUrl}/points/mine`)
  }
}
