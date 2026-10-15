import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { LoginComponent } from '@resttek/web-shared';
import { ShellComponent } from './core/layout/shell.component';
import { authGuard, AuthStore } from '@resttek/web-shared';
import { roleGuard, defaultRouteFor } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('@resttek/web-shared').then(m => m.LoginComponent)
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: () => defaultRouteFor(inject(AuthStore).userRole()),
        pathMatch: 'full'
      },
      {
        path: 'cocina',
        canActivate: [roleGuard('cocinero', 'manager')],
        loadComponent: () => import('./features/orders/pages/cocina/cocina.component').then(m => m.CocinaComponent),
      },
      {
        path: 'barra',
        canActivate: [roleGuard('camarero', 'manager')],
        loadComponent: () => import('./features/orders/pages/barra/barra.component').then(m => m.BarraComponent),
      },
      {
        path: 'salon',
        canActivate: [roleGuard('camarero', 'manager')],
        loadComponent: () => import('./features/orders/pages/salon/salon.component').then(m => m.SalonComponent),
      }
    ]
  },
  {
    path: '**',
    loadComponent: () => import('./core/layout/not-found.component').then(m => m.NotFoundComponent)
  }
];
