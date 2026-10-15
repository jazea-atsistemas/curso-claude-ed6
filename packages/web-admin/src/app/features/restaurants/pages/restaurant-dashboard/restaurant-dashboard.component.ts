import { Component, inject, signal } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { RestaurantStore } from '../../store/restaurant.store'

@Component({
  selector: 'app-restaurant-dashboard',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  templateUrl: './restaurant-dashboard.component.html',
  styleUrl: './restaurant-dashboard.component.css'
})
export class RestaurantDashboardComponent {
  private readonly route = inject(ActivatedRoute)
  private readonly restaurantStore = inject(RestaurantStore)

  restaurantId = ''
  restaurantName = signal('')

  constructor() {
    // El componente se reutiliza al cambiar de restaurante, así que hay que reaccionar al cambio de parámetro
    this.route.parent!.paramMap.pipe(takeUntilDestroyed()).subscribe(params => {
      this.restaurantId = params.get('restaurantId') ?? ''
      const restaurant = this.restaurantStore.getById(this.restaurantId)
      this.restaurantName.set(restaurant?.name ?? 'Restaurante')
    })
  }
}
