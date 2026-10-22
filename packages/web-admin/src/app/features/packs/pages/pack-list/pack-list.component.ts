import { Component, inject } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { PackStore } from '../../store/pack.store'
import { packErrorMessage } from '../../pack-errors'
import type { Pack } from '../../models/pack.model'

@Component({
  selector: 'app-pack-list',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  templateUrl: './pack-list.component.html',
  styleUrl: './pack-list.component.css'
})
export class PackListComponent {
  readonly store = inject(PackStore)
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

  slotSummary(pack: Pack): string {
    return pack.slots.map(s => s.name).join(' + ')
  }

  formatPrice(price: number): string {
    return price.toFixed(2) + ' €'
  }

  async onDelete(id: string): Promise<void> {
    if (!this.restaurantId) return
    if (confirm('¿Estás seguro de eliminar este pack?')) {
      try {
        await this.store.delete(this.restaurantId, id)
      } catch (err) {
        alert(packErrorMessage(err, 'Error al eliminar el pack.'))
        this.store.loadByRestaurant(this.restaurantId)
      }
    }
  }
}
