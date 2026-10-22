import { Component, inject, OnInit, signal, computed } from '@angular/core'
import { RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { PointsService } from '../../core/services/points.service'
import { ClientPoints } from '../../core/models/points.model'

@Component({
  selector: 'app-my-points',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  template: `
    <div class="container">
      <div class="page-header">
        <h1>Mis Puntos</h1>
      </div>

      @if (loading()) {
        <div class="spinner"></div>
      } @else if (error()) {
        <div class="alert-error">{{ error() }}</div>
      } @else if (points().length === 0) {
        <div class="empty-state card">
          <p>Todavía no tienes puntos. Pide la cuenta de tus pedidos para empezar a sumar.</p>
          <a routerLink="/restaurants" class="btn btn-primary" style="margin-top: 16px;">
            Ver restaurantes
          </a>
        </div>
      } @else {
        <div class="points-list">
          @for (p of points(); track p.restaurantId) {
            <div class="points-card card">
              <span class="restaurant-name">{{ p.restaurantName || 'Restaurante' }}</span>
              <span class="balance">
                <lucide-icon name="star" [size]="18"></lucide-icon>
                {{ p.balance }} {{ p.balance === 1 ? 'punto' : 'puntos' }}
              </span>
            </div>
          }
        </div>
        <p class="total">Total: {{ totalPoints() }} puntos</p>
      }
    </div>
  `,
  styles: [`
    .container {
      max-width: 800px;
      margin: 0 auto;
    }
    .points-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .points-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .restaurant-name {
      font-weight: 600;
      color: var(--text-primary);
    }
    .balance {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--green-light);
      font-weight: 700;
    }
    .total {
      margin-top: 16px;
      color: var(--text-secondary);
      text-align: right;
    }
  `]
})
export class MyPointsComponent implements OnInit {
  private readonly pointsService = inject(PointsService)

  readonly points = signal<ClientPoints[]>([])
  readonly loading = signal(true)
  readonly error = signal<string | null>(null)
  readonly totalPoints = computed(() => this.points().reduce((sum, p) => sum + p.balance, 0))

  ngOnInit(): void {
    this.pointsService.getMyPoints().subscribe({
      next: (points) => {
        this.points.set(points)
        this.loading.set(false)
      },
      error: () => {
        this.error.set('Error al cargar tus puntos')
        this.loading.set(false)
      }
    })
  }
}
