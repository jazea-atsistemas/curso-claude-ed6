import { Database } from '@config/database.js'
import type { Table } from '@models/table.model.js'
import { normalizeTableStatus } from '@models/table.model.js'

interface TableRow {
    id: string
    restaurantId: string
    number: number
    description: string | null
    capacity: number
    status: string
    createdAt: string
    updatedAt: string
}

export interface TableRepository {
    findById(id: string, restaurantId: string): Promise<Table | null>
    findByRestaurantId(restaurantId: string): Promise<Table[]>
    findByNumber(restaurantId: string, number: number): Promise<Table | null>
    findAvailable(restaurantId: string, people: number): Promise<Table[]>
    save(table: Table): Promise<void>
    delete(id: string, restaurantId: string): Promise<void>
    occupyIfAvailable(id: string, restaurantId: string, people: number, updatedAt: string): Promise<boolean>
}

const SELECT_COLUMNS = 'SELECT id, restaurant_id as restaurantId, number, description, capacity, status, created_at as createdAt, updated_at as updatedAt FROM tables'

export class SqliteTableRepository implements TableRepository {
    constructor(private db: Database) {}

    async findById(id: string, restaurantId: string): Promise<Table | null> {
        const row = await this.db.get<TableRow>(
            `${SELECT_COLUMNS} WHERE id = ? AND restaurant_id = ?`,
            [id, restaurantId]
        )
        if (!row) return null
        return this.mapToTable(row)
    }

    async findByRestaurantId(restaurantId: string): Promise<Table[]> {
        const rows = await this.db.all<TableRow>(
            `${SELECT_COLUMNS} WHERE restaurant_id = ? ORDER BY number ASC`,
            [restaurantId]
        )
        return rows.map(row => this.mapToTable(row))
    }

    async findByNumber(restaurantId: string, number: number): Promise<Table | null> {
        const row = await this.db.get<TableRow>(
            `${SELECT_COLUMNS} WHERE restaurant_id = ? AND number = ?`,
            [restaurantId, number]
        )
        if (!row) return null
        return this.mapToTable(row)
    }

    async findAvailable(restaurantId: string, people: number): Promise<Table[]> {
        const rows = await this.db.all<TableRow>(
            `${SELECT_COLUMNS} WHERE restaurant_id = ? AND status = 'libre' AND capacity >= ? ORDER BY capacity ASC, number ASC`,
            [restaurantId, people]
        )
        return rows.map(row => this.mapToTable(row))
    }

    async save(table: Table): Promise<void> {
        const existing = await this.findById(table.id, table.restaurantId)
        if (existing) {
            await this.db.run(
                'UPDATE tables SET number = ?, description = ?, capacity = ?, status = ?, updated_at = ? WHERE id = ? AND restaurant_id = ?',
                [table.number, table.description, table.capacity, table.status, table.updatedAt, table.id, table.restaurantId]
            )
        } else {
            await this.db.run(
                'INSERT INTO tables (id, restaurant_id, number, description, capacity, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [table.id, table.restaurantId, table.number, table.description, table.capacity, table.status, table.createdAt, table.updatedAt]
            )
        }
    }

    async delete(id: string, restaurantId: string): Promise<void> {
        await this.db.run('DELETE FROM tables WHERE id = ? AND restaurant_id = ?', [id, restaurantId])
    }

    // UPDATE condicional: si dos clientes ocupan la misma mesa a la vez, solo uno cambia la fila
    async occupyIfAvailable(id: string, restaurantId: string, people: number, updatedAt: string): Promise<boolean> {
        const result = await this.db.run(
            `UPDATE tables SET status = 'ocupada', updated_at = ?
             WHERE id = ? AND restaurant_id = ? AND status = 'libre' AND capacity >= ?`,
            [updatedAt, id, restaurantId, people]
        )
        return result.changes > 0
    }

    private mapToTable(row: TableRow): Table {
        return {
            id: row.id,
            restaurantId: row.restaurantId,
            number: row.number,
            description: row.description,
            capacity: row.capacity,
            status: normalizeTableStatus(row.status),
            createdAt: row.createdAt,
            updatedAt: row.updatedAt
        }
    }
}
