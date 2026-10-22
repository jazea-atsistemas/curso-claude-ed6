import { Component, inject, OnInit, signal, computed } from '@angular/core'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { DecimalPipe } from '@angular/common'
import { LucideAngularModule } from 'lucide-angular'
import { DishService } from '../../core/services/dish.service'
import { PackService } from '../../core/services/pack.service'
import { Pack, PackChoice } from '../../core/models/pack.model'
import { RestaurantService } from '../../core/services/restaurant.service'
import { CartStore, Dish } from '../../core/store/cart.store'
import { SelectedTable } from '../../core/models/table.model'
import { Restaurant } from '../../core/models/restaurant.model'

@Component({
  selector: 'app-restaurant-menu',
  standalone: true,
  imports: [RouterLink, LucideAngularModule, DecimalPipe],
  template: `
    <div class="container">
      <div class="page-header">
        <div>
          <a routerLink="/restaurants" class="back-link">← Volver a restaurantes</a>
          <h1>{{ restaurant()?.name || 'Cargando...' }}</h1>
          @if (table(); as t) {
            <p class="table-info">
              Mesa {{ t.number }} ·
              <a [routerLink]="['/restaurants', t.restaurantId, 'mesa']" [queryParams]="{ cambiar: 1 }"
                 (click)="confirmChange($event)">Cambiar mesa</a>
            </p>
          }
        </div>
      </div>

      @if (loading()) {
        <div class="spinner"></div>
      } @else if (error()) {
        <div class="alert-error">{{ error() }}</div>
      } @else {
        <div class="menu-layout">
          <div class="menu-content">
            @if (packs().length > 0) {
              <div class="category-section">
                <h2 class="category-title">Packs</h2>
                <div class="dishes-grid">
                  @for (pack of packs(); track pack.id) {
                    <div class="pack-card card">
                      <div class="dish-card-row">
                        <div class="dish-info">
                          <h3>{{ pack.name }}</h3>
                          <p class="dish-description">{{ pack.description || slotSummary(pack) }}</p>
                          <p class="dish-price">{{ pack.price | number:'1.2-2' }} €</p>
                        </div>
                        @if (openPackId() !== pack.id) {
                          <button class="btn btn-primary btn-sm" (click)="openPack(pack)">Elegir</button>
                        }
                      </div>
                      @if (openPackId() === pack.id) {
                        <div class="pack-chooser">
                          @for (slot of pack.slots; track slot.id) {
                            <label class="pack-slot">
                              <span>{{ slot.name }}</span>
                              <select class="form-control" [value]="packSelection()[slot.id] || ''"
                                      (change)="choose(slot.id, $any($event.target).value)">
                                <option value="" disabled>Elige {{ slot.name.toLowerCase() }}…</option>
                                @for (option of slot.options; track option.id) {
                                  <option [value]="option.id">{{ option.name }}</option>
                                }
                              </select>
                            </label>
                          }
                          <div class="pack-actions">
                            <button class="btn btn-secondary btn-sm" (click)="closePack()">Cancelar</button>
                            <button class="btn btn-primary btn-sm" [disabled]="!isPackComplete(pack)" (click)="addPackToCart(pack)">
                              Añadir pack
                            </button>
                          </div>
                        </div>
                      }
                    </div>
                  }
                </div>
              </div>
            }
            @for (category of categories(); track category) {
              <div class="category-section">
                <h2 class="category-title">{{ category }}</h2>
                <div class="dishes-grid">
                  @for (dish of getDishesByCategory(category); track dish.id) {
                    <div class="dish-card card">
                      <div class="dish-info">
                        <h3>{{ dish.name }}</h3>
                        @if (dish.description) {
                          <p class="dish-description">{{ dish.description }}</p>
                        }
                        <p class="dish-price">{{ dish.price | number:'1.2-2' }} €</p>
                      </div>
                      <div class="dish-actions">
                        <div class="quantity-selector">
                          <button class="qty-btn" (click)="decrementQuantity(dish)">-</button>
                          <span>{{ getQuantity(dish.id) }}</span>
                          <button class="qty-btn" (click)="incrementQuantity(dish)">+</button>
                        </div>
                        <button class="btn btn-primary btn-sm" (click)="addToCart(dish)">
                          Añadir
                        </button>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
          </div>

          <aside class="cart-summary card">
            <h3>Tu pedido</h3>
            @if (cartStore.isEmpty()) {
              <p class="empty-cart">Tu carrito está vacío</p>
            } @else {
              <div class="cart-items">
                @for (pack of cartStore.packs(); track pack.key) {
                  <div class="cart-item">
                    <span class="item-name">{{ pack.name }} x{{ pack.quantity }}</span>
                    <span class="item-price">{{ pack.price * pack.quantity | number:'1.2-2' }} €</span>
                  </div>
                }
                @for (item of cartStore.items(); track item.dish.id) {
                  <div class="cart-item">
                    <span class="item-name">{{ item.dish.name }} x{{ item.quantity }}</span>
                    <span class="item-price">{{ item.dish.price * item.quantity | number:'1.2-2' }} €</span>
                  </div>
                }
              </div>
              <div class="cart-total">
                <span>Total:</span>
                <strong>{{ cartStore.total() | number:'1.2-2' }} €</strong>
              </div>
              <a routerLink="/cart" class="btn btn-primary" style="width: 100%; justify-content: center;">
                Ver carrito ({{ cartStore.itemCount() }})
              </a>
            }
          </aside>
        </div>
      }
    </div>
  `,
  styles: [`
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    .table-info {
      color: var(--text-secondary);
      font-size: 14px;
      margin-top: 4px;
    }
    .back-link {
      font-size: 13px;
      color: var(--text-muted);
      margin-bottom: 8px;
      display: inline-block;
    }
    .menu-layout {
      display: grid;
      grid-template-columns: 1fr 320px;
      gap: 24px;
    }
    @media (max-width: 900px) {
      .menu-layout {
        grid-template-columns: 1fr;
      }
    }
    .category-section {
      margin-bottom: 32px;
    }
    .category-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--text-secondary);
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border-color);
    }
    .dishes-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .dish-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      padding: 16px 20px;
    }
    .dish-info h3 {
      font-size: 15px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .dish-description {
      color: var(--text-muted);
      font-size: 13px;
      margin-bottom: 6px;
    }
    .dish-price {
      color: var(--green-light);
      font-weight: 600;
    }
    .dish-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .quantity-selector {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--bg-input);
      border-radius: var(--radius-sm);
      padding: 4px;
    }
    .qty-btn {
      width: 28px;
      height: 28px;
      border-radius: 4px;
      background: var(--bg-hover);
      color: var(--text-primary);
      font-weight: 600;
    }
    .qty-btn:hover {
      background: var(--green-glow);
      color: var(--green-light);
    }
    .pack-card {
      padding: 16px 20px;
    }
    .dish-card-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
    }
    .pack-chooser {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 14px;
      padding-top: 14px;
      border-top: 1px solid var(--border-color);
    }
    .pack-slot {
      display: grid;
      grid-template-columns: 120px 1fr;
      align-items: center;
      gap: 12px;
      font-size: 14px;
      color: var(--text-secondary);
    }
    @media (max-width: 600px) {
      .pack-slot {
        grid-template-columns: 1fr;
        gap: 4px;
      }
    }
    .pack-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .cart-summary {
      position: sticky;
      top: 84px;
      height: fit-content;
    }
    .cart-summary h3 {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 16px;
    }
    .empty-cart {
      color: var(--text-muted);
      text-align: center;
      padding: 24px 0;
    }
    .cart-items {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 16px;
    }
    .cart-item {
      display: flex;
      justify-content: space-between;
      font-size: 14px;
    }
    .item-name {
      color: var(--text-secondary);
    }
    .item-price {
      color: var(--text-primary);
    }
    .cart-total {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-top: 1px solid var(--border-color);
      margin-bottom: 16px;
    }
  `]
})
export class RestaurantMenuComponent implements OnInit {
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly dishService = inject(DishService)
  private readonly packService = inject(PackService)
  private readonly restaurantService = inject(RestaurantService)
  readonly cartStore = inject(CartStore)

  readonly restaurant = signal<Restaurant | null>(null)
  readonly dishes = signal<Dish[]>([])
  readonly packs = signal<Pack[]>([])
  readonly openPackId = signal<string | null>(null)
  /** slotId → dishId del pack que se está eligiendo */
  readonly packSelection = signal<Record<string, string>>({})
  private restaurantId = ''
  readonly loading = signal(true)
  readonly error = signal<string | null>(null)
  private quantities = signal<Record<string, number>>({})

  readonly categories = computed(() => {
    const cats = [...new Set(this.dishes().map(d => d.category))]
    return cats.sort((a, b) => {
      const order = ['Entrante', 'Entrantes', 'Primero', 'Primeros', 'Segundo', 'Segundos', 'Principal', 'Principales', 'Postre', 'Postres', 'Bebida', 'Bebidas']
      const aIdx = order.findIndex(o => a.toLowerCase().includes(o.toLowerCase()))
      const bIdx = order.findIndex(o => b.toLowerCase().includes(o.toLowerCase()))
      if (aIdx >= 0 && bIdx >= 0) return aIdx - bIdx
      if (aIdx >= 0) return -1
      if (bIdx >= 0) return 1
      return a.localeCompare(b)
    })
  })

  readonly table = signal<SelectedTable | null>(null)

  confirmChange(event: Event): void {
    if (!confirm('Tu mesa actual seguirá ocupada hasta que la libere el personal. ¿Cambiar de mesa?')) {
      event.preventDefault()
    }
  }

  ngOnInit(): void {
    const restaurantId = this.route.snapshot.paramMap.get('id')!
    const table = this.cartStore.tableFor(restaurantId)
    if (!table) {
      this.router.navigate(['/restaurants', restaurantId, 'mesa'], { replaceUrl: true })
      return
    }
    this.table.set(table)
    this.restaurantId = restaurantId
    this.loadData(restaurantId)
  }

  private loadData(restaurantId: string): void {
    this.restaurantService.getById(restaurantId).subscribe({
      next: (restaurant) => this.restaurant.set(restaurant),
      error: () => {}
    })
    // Sin packs la carta sigue funcionando: un error aquí no bloquea los platos
    this.packService.getByRestaurant(restaurantId).subscribe({
      next: (packs) => this.packs.set(packs),
      error: () => {}
    })
    this.dishService.getByRestaurant(restaurantId).subscribe({
      next: (dishes) => {
        this.dishes.set(dishes)
        this.loading.set(false)
      },
      error: () => {
        this.error.set('Error al cargar la carta')
        this.loading.set(false)
      }
    })
  }

  getDishesByCategory(category: string): Dish[] {
    return this.dishes().filter(d => d.category === category)
  }

  getQuantity(dishId: string): number {
    return this.quantities()[dishId] || 1
  }

  incrementQuantity(dish: Dish): void {
    this.quantities.update(q => ({ ...q, [dish.id]: (q[dish.id] || 1) + 1 }))
  }

  decrementQuantity(dish: Dish): void {
    const current = this.quantities()[dish.id] || 1
    if (current > 1) {
      this.quantities.update(q => ({ ...q, [dish.id]: current - 1 }))
    }
  }

  addToCart(dish: Dish): void {
    const quantity = this.getQuantity(dish.id)
    this.cartStore.addItem(dish, quantity)
    this.quantities.update(q => ({ ...q, [dish.id]: 1 }))
  }

  slotSummary(pack: Pack): string {
    return pack.slots.map(s => s.name).join(' + ')
  }

  openPack(pack: Pack): void {
    this.openPackId.set(pack.id)
    // Si un hueco solo tiene una opción, se elige sola
    const preselected: Record<string, string> = {}
    for (const slot of pack.slots) {
      if (slot.options.length === 1) preselected[slot.id] = slot.options[0].id
    }
    this.packSelection.set(preselected)
  }

  closePack(): void {
    this.openPackId.set(null)
    this.packSelection.set({})
  }

  choose(slotId: string, dishId: string): void {
    this.packSelection.update(sel => ({ ...sel, [slotId]: dishId }))
  }

  isPackComplete(pack: Pack): boolean {
    const sel = this.packSelection()
    return pack.slots.every(slot => slot.options.some(o => o.id === sel[slot.id]))
  }

  addPackToCart(pack: Pack): void {
    if (!this.isPackComplete(pack)) return
    const sel = this.packSelection()
    const choices: PackChoice[] = pack.slots.map(slot => ({
      slotId: slot.id,
      slotName: slot.name,
      dishId: sel[slot.id],
      dishName: slot.options.find(o => o.id === sel[slot.id])!.name
    }))
    this.cartStore.addPack(this.restaurantId, pack, choices)
    this.closePack()
  }
}
