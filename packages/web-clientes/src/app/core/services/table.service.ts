import { Injectable, inject } from '@angular/core'
import { HttpClient, HttpParams } from '@angular/common/http'
import { Observable } from 'rxjs'
import { API_URL } from '@resttek/web-shared'
import { OccupiedTable, PublicTable } from '../models/table.model'

@Injectable({ providedIn: 'root' })
export class TableService {
  private readonly http = inject(HttpClient)
  private readonly apiUrl = inject(API_URL)

  getAvailable(restaurantId: string, people: number): Observable<PublicTable[]> {
    return this.http.get<PublicTable[]>(`${this.apiUrl}/restaurants/${restaurantId}/tables/available`, {
      params: new HttpParams().set('people', people)
    })
  }

  occupy(restaurantId: string, tableId: string, people: number): Observable<OccupiedTable> {
    return this.http.post<OccupiedTable>(`${this.apiUrl}/restaurants/${restaurantId}/tables/${tableId}/occupy`, { people })
  }
}
