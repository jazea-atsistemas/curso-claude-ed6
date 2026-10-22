import { Component, inject, OnInit, OnDestroy, computed } from '@angular/core';
import { AuthStore } from '@resttek/web-shared';
import { TableStore } from '../../store/table.store';
import { OrderStore } from '../../../orders/store/order.store';
import { Table, TableStatus } from '../../models/table.model';

@Component({
  selector: 'app-mesas',
  standalone: true,
  templateUrl: './mesas.component.html',
  styleUrl: './mesas.component.css'
})
export class MesasComponent implements OnInit, OnDestroy {
  private readonly authStore = inject(AuthStore);
  readonly tableStore = inject(TableStore);
  readonly orderStore = inject(OrderStore);

  readonly statuses: TableStatus[] = ['libre', 'ocupada', 'reservada'];

  readonly canChangeStatus = computed(() => {
    const role = this.authStore.userRole();
    return role === 'camarero' || role === 'manager';
  });

  ngOnInit(): void {
    const restaurantId = this.authStore.user()?.restaurantId;
    if (restaurantId) {
      this.tableStore.startPolling(restaurantId);
      this.orderStore.startPolling(restaurantId);
    }
  }

  ngOnDestroy(): void {
    this.tableStore.stopPolling();
    this.orderStore.stopPolling();
  }

  activeOrdersOf(table: Table) {
    return this.orderStore.orders()
      .filter(order => order.tableId === table.id)
      .map(order => ({
        ...order,
        items: order.items.filter(item => item.status !== 'entregado')
      }))
      .filter(order => order.items.length > 0);
  }

  changeStatus(table: Table, status: TableStatus): void {
    const restaurantId = this.authStore.user()?.restaurantId;
    if (restaurantId && status !== table.status) {
      this.tableStore.changeStatus(restaurantId, table.id, status);
    }
  }

  getStatusClass(status: string): string {
    return `badge badge-${status}`;
  }
}
