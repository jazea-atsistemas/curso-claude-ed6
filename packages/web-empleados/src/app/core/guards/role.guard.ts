import { inject } from '@angular/core'
import { Router, type CanActivateFn } from '@angular/router'
import { AuthStore } from '@resttek/web-shared'

export function defaultRouteFor(role: string | null): string {
  if (role === 'cocinero') return '/cocina'
  if (role === 'manager') return '/cocina'
  if (role === 'camarero') return '/barra'
  return '/login'
}

export function roleGuard(...roles: string[]): CanActivateFn {
  return () => {
    const role = inject(AuthStore).userRole()
    if (role && roles.includes(role)) return true
    return inject(Router).createUrlTree([defaultRouteFor(role)])
  }
}
