import { Injectable, inject } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable } from 'rxjs'
import { API_URL } from '@resttek/web-shared'
import { Order, OrderBill } from '../models/order.model'

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient)
  private readonly apiUrl = inject(API_URL)

  createOrder(restaurantId: string, tableId: string | null, items: { dishId: string; quantity: number; notes: string | null }[]): Observable<Order> {
    return this.http.post<Order>(`${this.apiUrl}/orders`, {
      restaurantId,
      tableId,
      items
    })
  }

  getMyOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.apiUrl}/orders/mine`)
  }

  getOrderById(id: string): Observable<Order> {
    return this.http.get<Order>(`${this.apiUrl}/orders/${id}`)
  }

  requestBill(id: string): Observable<OrderBill> {
    return this.http.post<OrderBill>(`${this.apiUrl}/orders/${id}/bill`, {})
  }
}
