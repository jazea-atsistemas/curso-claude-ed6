import { Component, inject, OnInit, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { firstValueFrom } from 'rxjs'
import { PackStore } from '../../store/pack.store'
import { PackService } from '../../services/pack.service'
import { DishService } from '../../../dishes/services/dish.service'
import { packErrorMessage } from '../../pack-errors'
import type { PackRestriction } from '../../models/pack.model'
import type { Dish, DishCategory } from '../../../dishes/models/dish.model'

interface SlotForm {
  // Clave local para el @for; la API genera los ids de los huecos al guardar
  key: number
  name: string
  category: DishCategory
  restriction: PackRestriction
  dishIds: string[]
}

interface PackForm {
  name: string
  description: string
  price: number | null
  active: boolean
  slots: SlotForm[]
}

const CATEGORY_LABELS: Record<DishCategory, string> = {
  entrante: 'Entrante',
  principal: 'Principal',
  postre: 'Postre',
  bebida: 'Bebida'
}

@Component({
  selector: 'app-pack-form',
  standalone: true,
  imports: [FormsModule, RouterLink, LucideAngularModule],
  templateUrl: './pack-form.component.html',
  styleUrl: './pack-form.component.css'
})
export class PackFormComponent implements OnInit {
  private readonly store = inject(PackStore)
  private readonly service = inject(PackService)
  private readonly dishService = inject(DishService)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)

  isEditing = false
  packId: string | null = null
  restaurantId = ''
  loading = signal(false)
  error = signal<string | null>(null)
  dishes = signal<Dish[]>([])

  categories: DishCategory[] = ['entrante', 'principal', 'postre', 'bebida']
  private nextKey = 0

  form: PackForm = {
    name: '',
    description: '',
    price: null,
    active: true,
    slots: [this.newSlot('entrante'), this.newSlot('principal'), this.newSlot('bebida')]
  }

  get pageTitle(): string {
    return this.isEditing ? 'Editar pack' : 'Nuevo pack'
  }

  get listUrl(): string {
    return `/restaurants/${this.restaurantId}/packs`
  }

  categoryLabel(category: DishCategory): string {
    return CATEGORY_LABELS[category]
  }

  dishesOf(category: DishCategory): Dish[] {
    return this.dishes().filter(d => d.category === category)
  }

  ngOnInit(): void {
    this.restaurantId = this.route.parent?.snapshot.params['restaurantId'] ?? ''
    const id = this.route.snapshot.paramMap.get('id')
    if (!this.restaurantId) return

    this.loadDishes()
    if (id) {
      this.isEditing = true
      this.packId = id
      this.loadPack()
    }
  }

  private newSlot(category: DishCategory): SlotForm {
    return { key: this.nextKey++, name: CATEGORY_LABELS[category], category, restriction: 'bloquear', dishIds: [] }
  }

  private async loadDishes(): Promise<void> {
    try {
      this.dishes.set(await firstValueFrom(this.dishService.getAll(this.restaurantId)))
    } catch {
      this.error.set('No se pudieron cargar los platos del restaurante.')
    }
  }

  private async loadPack(): Promise<void> {
    this.loading.set(true)
    try {
      const p = await firstValueFrom(this.service.getById(this.restaurantId, this.packId!))
      this.form = {
        name: p.name,
        description: p.description ?? '',
        price: p.price,
        active: p.active,
        slots: p.slots.map(s => ({ key: this.nextKey++, name: s.name, category: s.category, restriction: s.restriction, dishIds: [...s.dishIds] }))
      }
    } catch (err) {
      this.error.set(packErrorMessage(err, 'No se pudo cargar el pack.'))
    } finally {
      this.loading.set(false)
    }
  }

  addSlot(): void {
    this.form.slots = [...this.form.slots, this.newSlot('principal')]
  }

  removeSlot(index: number): void {
    this.form.slots = this.form.slots.filter((_, i) => i !== index)
  }

  moveSlot(index: number, delta: number): void {
    const target = index + delta
    if (target < 0 || target >= this.form.slots.length) return
    const slots = [...this.form.slots]
    ;[slots[index], slots[target]] = [slots[target]!, slots[index]!]
    this.form.slots = slots
  }

  onCategoryChange(slot: SlotForm, category: DishCategory): void {
    // Los platos marcados eran de la categoría anterior
    if (slot.name === CATEGORY_LABELS[slot.category]) {
      slot.name = CATEGORY_LABELS[category]
    }
    slot.category = category
    slot.dishIds = []
  }

  toggleDish(slot: SlotForm, dishId: string, checked: boolean): void {
    slot.dishIds = checked ? [...slot.dishIds, dishId] : slot.dishIds.filter(id => id !== dishId)
  }

  async onSubmit(): Promise<void> {
    this.error.set(null)
    if (!this.form.name.trim()) {
      this.error.set('El pack necesita un nombre.')
      return
    }
    const price = this.form.price
    if (price === null || !(price > 0)) {
      this.error.set('El precio debe ser mayor que 0.')
      return
    }
    if (this.form.slots.length === 0) {
      this.error.set('El pack necesita al menos un hueco.')
      return
    }
    if (this.form.slots.some(s => s.restriction === 'permitir' && s.dishIds.length === 0)) {
      this.error.set('Un hueco con "solo los marcados" necesita al menos un plato marcado.')
      return
    }

    const dto = {
      name: this.form.name.trim(),
      description: this.form.description.trim() || null,
      price,
      active: this.form.active,
      slots: this.form.slots.map(s => ({
        name: s.name.trim() || CATEGORY_LABELS[s.category],
        category: s.category,
        restriction: s.restriction,
        dishIds: s.dishIds
      }))
    }

    this.loading.set(true)
    try {
      if (this.isEditing && this.packId) {
        await this.store.update(this.restaurantId, this.packId, dto)
      } else {
        await this.store.create(this.restaurantId, dto)
      }
      this.router.navigate(['/restaurants', this.restaurantId, 'packs'])
    } catch (err) {
      this.error.set(packErrorMessage(err, 'Error al guardar el pack.'))
    } finally {
      this.loading.set(false)
    }
  }
}
