import { Component, inject, OnInit, signal } from '@angular/core'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { FormsModule } from '@angular/forms'
import { HttpErrorResponse } from '@angular/common/http'
import { TableService } from '../../core/services/table.service'
import { CartStore } from '../../core/store/cart.store'
import { PublicTable } from '../../core/models/table.model'

@Component({
  selector: 'app-table-select',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <div class="container">
      <div class="page-header">
        <div>
          <a routerLink="/restaurants" class="back-link">← Volver a restaurantes</a>
          <h1>Elige tu mesa</h1>
        </div>
      </div>

      @if (changing()) {
        <div class="alert-error">
          Tu mesa anterior seguirá ocupada hasta que la libere el personal del restaurante.
        </div>
      }

      <div class="card people-card">
        <label for="people">¿Cuántas personas sois?</label>
        <div class="people-row">
          <input id="people" type="number" min="1" step="1" [ngModel]="people()" (ngModelChange)="people.set($event)" />
          <button class="btn btn-primary" [disabled]="loading()" (click)="search()">Ver mesas disponibles</button>
        </div>
      </div>

      @if (error()) {
        <div class="alert-error">{{ error() }}</div>
      }

      @if (searched()) {
        @if (loading()) {
          <div class="spinner"></div>
        } @else if (tables().length === 0) {
          <div class="empty-state card">
            <p>No hay mesas disponibles para {{ searchedPeople() }} personas</p>
          </div>
        } @else {
          <div class="table-grid">
            @for (table of tables(); track table.id) {
              <button type="button" class="table-card card" [class.selected]="selectedId() === table.id"
                      (click)="selectedId.set(table.id)">
                <h3>Mesa {{ table.number }}</h3>
                <p>Capacidad: {{ table.capacity }}</p>
                @if (table.description) {
                  <p class="desc">{{ table.description }}</p>
                }
              </button>
            }
          </div>
          <button class="btn btn-primary continue" [disabled]="!selectedId() || occupying()" (click)="continue()">
            @if (occupying()) { Reservando mesa... } @else { Continuar }
          </button>
        }
      }
    </div>
  `,
  styles: [`
    .container { max-width: 900px; margin: 0 auto; }
    .people-card { padding: 20px; margin-bottom: 20px; }
    .people-card label { display: block; margin-bottom: 8px; font-weight: 600; }
    .people-row { display: flex; gap: 12px; }
    .people-row input { width: 100px; }
    .table-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 20px;
    }
    .table-card { padding: 16px; text-align: left; cursor: pointer; border: 1px solid var(--border-color); }
    .table-card.selected { border-color: var(--green-medium); background: var(--green-glow); }
    .table-card h3 { font-size: 16px; margin-bottom: 4px; }
    .table-card p { color: var(--text-secondary); font-size: 13px; }
    .table-card .desc { color: var(--text-muted); margin-top: 4px; }
    .continue { width: 100%; justify-content: center; }
  `]
})
export class TableSelectComponent implements OnInit {
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly tableService = inject(TableService)
  private readonly cartStore = inject(CartStore)

  private restaurantId = ''

  readonly people = signal<number>(2)
  readonly searchedPeople = signal<number>(0)
  readonly tables = signal<PublicTable[]>([])
  readonly selectedId = signal<string | null>(null)
  readonly searched = signal(false)
  readonly loading = signal(false)
  readonly occupying = signal(false)
  readonly error = signal<string | null>(null)
  readonly changing = signal(false)

  ngOnInit(): void {
    this.restaurantId = this.route.snapshot.paramMap.get('id')!
    const changing = this.route.snapshot.queryParamMap.has('cambiar')
    if (this.cartStore.tableFor(this.restaurantId) && !changing) {
      this.router.navigate(['/restaurants', this.restaurantId], { replaceUrl: true })
      return
    }
    this.changing.set(changing && !!this.cartStore.tableFor(this.restaurantId))
    if (this.route.snapshot.queryParamMap.get('motivo') === 'mesa-no-disponible') {
      this.error.set('Tu mesa ya no está disponible. Elige otra.')
    }
  }

  search(): void {
    const people = Number(this.people())
    if (!Number.isInteger(people) || people < 1) {
      this.error.set('Indica un número de personas válido (1 o más)')
      return
    }
    this.error.set(null)
    this.loading.set(true)
    this.searched.set(true)
    this.selectedId.set(null)
    this.tableService.getAvailable(this.restaurantId, people).subscribe({
      next: (tables) => {
        this.searchedPeople.set(people)
        this.tables.set(tables)
        this.loading.set(false)
      },
      error: () => {
        this.tables.set([])
        this.error.set('Error al cargar las mesas disponibles')
        this.loading.set(false)
      }
    })
  }

  continue(): void {
    const tableId = this.selectedId()
    if (!tableId) return
    const people = this.searchedPeople()
    this.occupying.set(true)
    this.error.set(null)
    this.tableService.occupy(this.restaurantId, tableId, people).subscribe({
      next: (table) => {
        this.cartStore.setTable({ restaurantId: this.restaurantId, tableId: table.id, number: table.number, people })
        this.router.navigate(['/restaurants', this.restaurantId])
      },
      error: (err: HttpErrorResponse) => {
        this.occupying.set(false)
        if (err.status === 409) {
          this.error.set('Esa mesa acaba de ocuparse. Elige otra.')
          this.search()
        } else {
          this.error.set('No se pudo ocupar la mesa. Inténtalo de nuevo.')
        }
      }
    })
  }
}
