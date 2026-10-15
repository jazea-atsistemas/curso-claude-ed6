import { Component, inject } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { EmployeeStore } from '../../store/employee.store'

@Component({
  selector: 'app-employee-list',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  templateUrl: './employee-list.component.html',
  styleUrl: './employee-list.component.css'
})
export class EmployeeListComponent {
  readonly store = inject(EmployeeStore)
  private readonly route = inject(ActivatedRoute)
  restaurantId = ''

  constructor() {
    // El componente se reutiliza al cambiar de restaurante, así que hay que reaccionar al cambio de parámetro
    this.route.parent!.paramMap.pipe(takeUntilDestroyed()).subscribe(params => {
      this.restaurantId = params.get('restaurantId') ?? ''
      if (this.restaurantId) {
        this.store.loadByRestaurant(this.restaurantId)
      }
    })
  }

  getRoleBadgeClass(role: string): string {
    return role === 'admin' ? 'badge' : 'badge badge-muted'
  }
}
