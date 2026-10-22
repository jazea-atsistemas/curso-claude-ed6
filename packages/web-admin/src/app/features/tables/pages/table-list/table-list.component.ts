import { Component, inject } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { TableStore } from '../../store/table.store'
import { tableErrorMessage } from '../../table-errors'

@Component({
  selector: 'app-table-list',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  templateUrl: './table-list.component.html',
  styleUrl: './table-list.component.css'
})
export class TableListComponent {
  readonly store = inject(TableStore)
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

  async onDelete(id: string): Promise<void> {
    if (!this.restaurantId) return
    if (confirm('¿Estás seguro de eliminar esta mesa?')) {
      try {
        await this.store.delete(this.restaurantId, id)
      } catch (err) {
        alert(tableErrorMessage(err, 'Error al eliminar la mesa.'))
        // Si ya no existe (404) o cambió de estado, refrescamos la lista
        this.store.loadByRestaurant(this.restaurantId)
      }
    }
  }
}
