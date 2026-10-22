import { Component, inject, signal } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { PointsRuleStore } from '../../store/points-rule.store'

interface PointsRuleForm {
  spendAmount: number | null
  pointsAwarded: number | null
}

@Component({
  selector: 'app-points-rule',
  standalone: true,
  imports: [FormsModule, LucideAngularModule],
  templateUrl: './points-rule.component.html',
  styleUrl: './points-rule.component.css'
})
export class PointsRuleComponent {
  private readonly route = inject(ActivatedRoute)
  readonly store = inject(PointsRuleStore)

  restaurantId = ''
  saving = signal(false)
  formError = signal<string | null>(null)
  success = signal<string | null>(null)

  form: PointsRuleForm = { spendAmount: null, pointsAwarded: null }

  constructor() {
    // El componente se reutiliza al cambiar de restaurante, así que hay que reaccionar al cambio de parámetro
    this.route.parent!.paramMap.pipe(takeUntilDestroyed()).subscribe(params => {
      this.restaurantId = params.get('restaurantId') ?? ''
      this.success.set(null)
      this.formError.set(null)
      this.load()
    })
  }

  private async load(): Promise<void> {
    const restaurantId = this.restaurantId
    await this.store.load(restaurantId)
    if (restaurantId !== this.restaurantId) return
    const rule = this.store.rule()
    this.form = {
      spendAmount: rule?.spendAmount ?? null,
      pointsAwarded: rule?.pointsAwarded ?? null
    }
  }

  async onSubmit(): Promise<void> {
    this.formError.set(null)
    this.success.set(null)
    const { spendAmount, pointsAwarded } = this.form
    if (typeof spendAmount !== 'number' || !(spendAmount >= 0.01)) {
      this.formError.set('El importe debe ser un número mayor o igual que 0,01 €.')
      return
    }
    if (!Number.isInteger(pointsAwarded) || pointsAwarded! < 1) {
      this.formError.set('Los puntos deben ser un entero mayor o igual que 1.')
      return
    }

    this.saving.set(true)
    try {
      await this.store.save(this.restaurantId, { spendAmount, pointsAwarded: pointsAwarded! })
      this.success.set('Regla de puntos guardada.')
    } catch (err: any) {
      this.formError.set(err?.error?.message ?? 'Error al guardar la regla de puntos.')
    } finally {
      this.saving.set(false)
    }
  }

  async onDisable(): Promise<void> {
    if (!confirm('¿Desactivar el sistema de puntos en este restaurante? Los clientes conservarán sus puntos.')) return
    this.formError.set(null)
    this.success.set(null)
    this.saving.set(true)
    try {
      await this.store.remove(this.restaurantId)
      this.form = { spendAmount: null, pointsAwarded: null }
      this.success.set('Sistema de puntos desactivado.')
    } catch {
      this.formError.set('Error al desactivar el sistema de puntos.')
    } finally {
      this.saving.set(false)
    }
  }
}
