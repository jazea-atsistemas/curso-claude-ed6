import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { DecimalPipe, DatePipe, NgClass } from '@angular/common'
import { LucideAngularModule } from 'lucide-angular'
import { OrderService } from '../../core/services/order.service'
import { Order, OrderItem, orderItemsTotal } from '../../core/models/order.model'

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [RouterLink, DecimalPipe, DatePipe, NgClass, LucideAngularModule],
  template: `
    <div class="container">
      @if (loading()) {
        <div class="spinner"></div>
      } @else if (error()) {
        <div class="alert-error">{{ error() }}</div>
      } @else if (order()) {
        <div class="page-header">
          <div>
            <a routerLink="/orders" class="back-link">← Volver a mis pedidos</a>
            <h1>Pedido #{{ order()!.id.substring(0, 8) }}</h1>
            <p class="order-date">{{ order()!.createdAt | date:'dd/MM/yyyy HH:mm' }}</p>
          </div>
        </div>

        <div class="ticket card">
          <div class="ticket-header">
            @if (order()!.restaurantLogoUrl) {
              <img [src]="order()!.restaurantLogoUrl" [alt]="order()!.restaurantName" class="ticket-logo">
            } @else {
              <lucide-icon name="utensils" [size]="24"></lucide-icon>
            }
            <span>{{ order()!.restaurantName || 'RestTek' }}</span>
          </div>
          
          <div class="ticket-divider"></div>

          <div class="ticket-items">
            @for (pack of packGroups(); track pack.packLineId) {
              <div class="ticket-item">
                <div class="item-main">
                  <span class="item-qty">1x</span>
                  <span class="item-name">{{ pack.packName }}</span>
                </div>
                <div class="item-status">
                  <ul class="pack-dishes">
                    @for (dish of pack.items; track dish.id) {
                      <li>
                        <span>{{ dish.dishName || 'Plato' }}</span>
                        <span class="status-badge" [ngClass]="getStatusClass(getStatusString(dish.status))">
                          {{ getStatusLabel(getStatusString(dish.status)) }}
                        </span>
                      </li>
                    }
                  </ul>
                  <span class="item-price">{{ pack.packPrice | number:'1.2-2' }} €</span>
                </div>
              </div>
            }
            @for (group of groupedItems(); track group.dishId) {
              <div class="ticket-item">
                <div class="item-main">
                  <span class="item-qty">{{ group.count }}x</span>
                  <span class="item-name">{{ group.dishName || 'Plato' }}</span>
                </div>
                <div class="item-status">
                  <div class="status-badges">
                    @for (sc of group.statusCounts; track sc.status) {
                      <span class="status-badge" [ngClass]="getStatusClass(sc.status)">
                        {{ sc.count }}x {{ sc.status === 'pendiente' ? 'Pendiente' : sc.status === 'preparando' ? 'Preparando' : sc.status === 'listo' ? 'Listo' : 'Entregado' }}
                      </span>
                    }
                  </div>
                  <span class="item-price">{{ (group.dishPrice || 0) * group.count | number:'1.2-2' }} €</span>
                </div>
              </div>
            }
          </div>

          <div class="ticket-divider"></div>

          <div class="ticket-total">
            <span>Total</span>
            <strong>{{ getTotal() | number:'1.2-2' }} €</strong>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .container {
      max-width: 500px;
      margin: 0 auto;
    }
    .back-link {
      font-size: 13px;
      color: var(--text-muted);
      margin-bottom: 8px;
      display: inline-block;
    }
    .order-date {
      color: var(--text-muted);
      font-size: 14px;
      margin-top: 4px;
    }
    .ticket {
      background: var(--bg-card);
      padding: 24px;
      font-family: 'Courier New', monospace;
    }
    .ticket-header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: var(--green-light);
      font-size: 18px;
      font-weight: 700;
    }
    .ticket-logo {
      width: 24px;
      height: 24px;
      object-fit: contain;
    }
    .ticket-divider {
      border-top: 1px dashed var(--border-color);
      margin: 20px 0;
    }
    .ticket-items {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .ticket-item {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .item-main {
      display: flex;
      gap: 8px;
    }
    .item-qty {
      color: var(--text-muted);
      min-width: 30px;
    }
    .item-name {
      color: var(--text-primary);
    }
    .item-status {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-left: 38px;
      gap: 8px;
    }
    .status-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .status-badge {
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 11px;
      font-family: 'Inter', sans-serif;
    }
    .status-pendiente {
      background: rgba(250, 204, 21, 0.15);
      color: var(--yellow);
    }
    .status-preparando {
      background: rgba(59, 130, 246, 0.15);
      color: #3b82f6;
    }
    .status-listo {
      background: var(--green-glow);
      color: var(--green-light);
    }
    .status-entregado {
      background: rgba(139, 146, 168, 0.1);
      color: var(--text-secondary);
    }
    .pack-dishes {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 13px;
      color: var(--text-secondary);
    }
    .pack-dishes li {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .item-price {
      color: var(--text-secondary);
      font-size: 13px;
    }
    .ticket-total {
      display: flex;
      justify-content: space-between;
      font-size: 18px;
      font-weight: 700;
    }
  `]
})
export class OrderDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute)
  private readonly orderService = inject(OrderService)
  private pollInterval: ReturnType<typeof setInterval> | null = null

  readonly order = signal<Order | null>(null)
  readonly loading = signal(true)
  readonly error = signal<string | null>(null)

  ngOnInit(): void {
    const orderId = this.route.snapshot.paramMap.get('id')!
    this.loadOrder(orderId)
    this.pollInterval = setInterval(() => this.loadOrder(orderId, false), 5000)
  }

  ngOnDestroy(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
    }
  }

  private loadOrder(orderId: string, showLoading = true): void {
    if (showLoading) this.loading.set(true)
    this.orderService.getOrderById(orderId).subscribe({
      next: (order) => {
        this.order.set(order)
        this.loading.set(false)
      },
      error: () => {
        this.error.set('Error al cargar el pedido')
        this.loading.set(false)
      }
    })
  }

  getTotal(): number {
    const o = this.order()
    if (!o) return 0
    return orderItemsTotal(o.items)
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pendiente: 'Pendiente',
      preparando: 'Preparando',
      listo: 'Listo',
      entregado: 'Entregado'
    }
    return labels[status] || status
  }

  getStatusClass(status: string): string {
    return 'status-' + status
  }

  getStatusString(status: string | { value: string }): string {
    if (typeof status === 'string') {
      return status
    }
    return status?.value || 'pendiente'
  }

  /** Cada pack pedido (packLineId) con sus platos y el estado de cada uno. */
  packGroups = computed(() => {
    const groups = new Map<string, { packLineId: string; packName: string; packPrice: number; items: OrderItem[] }>()
    for (const item of this.order()?.items || []) {
      if (!item.packLineId) continue
      const group = groups.get(item.packLineId)
      if (group) {
        group.items.push(item)
      } else {
        groups.set(item.packLineId, {
          packLineId: item.packLineId,
          packName: item.packName || 'Pack',
          packPrice: item.packPrice || 0,
          items: [item]
        })
      }
    }
    return Array.from(groups.values())
  })

  /** Platos sueltos (fuera de packs) agrupados por plato. */
  groupedItems = computed(() => {
    const items = (this.order()?.items || []).filter(item => !item.packLineId)
    const groups = new Map<string, { dishId: string; dishName: string; dishPrice: number; statusCounts: { status: string; count: number }[] }>()

    for (const item of items) {
      const itemStatus = this.getStatusString(item.status)
      const key = item.dishId
      const existing = groups.get(key)

      if (existing) {
        const statusIdx = existing.statusCounts.findIndex(s => s.status === itemStatus)
        if (statusIdx >= 0) {
          existing.statusCounts[statusIdx].count++
        } else {
          existing.statusCounts.push({ status: itemStatus, count: 1 })
        }
      } else {
        groups.set(key, {
          dishId: item.dishId,
          dishName: item.dishName || 'Plato',
          dishPrice: item.dishPrice || 0,
          statusCounts: [{ status: itemStatus, count: 1 }]
        })
      }
    }

    return Array.from(groups.values()).map(group => ({
      ...group,
      count: group.statusCounts.reduce((sum, s) => sum + s.count, 0)
    }))
  })
}
