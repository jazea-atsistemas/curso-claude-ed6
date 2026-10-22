import { Database } from '@config/database.js'
import type { Pack, PackSlot } from '@models/pack.model.js'
import { normalizePackRestriction } from '@models/pack.model.js'
import { normalizeDishCategory } from '@models/dish.model.js'

interface PackRow {
    id: string
    restaurantId: string
    name: string
    description: string | null
    price: number
    active: number
    createdAt: string
    updatedAt: string
}

interface PackSlotRow {
    id: string
    name: string
    category: string
    restriction: string
}

export interface PackRepository {
    findById(id: string, restaurantId: string): Promise<Pack | null>
    findByRestaurantId(restaurantId: string): Promise<Pack[]>
    save(pack: Pack): Promise<void>
    delete(id: string, restaurantId: string): Promise<void>
}

const SELECT_COLUMNS = 'SELECT id, restaurant_id as restaurantId, name, description, price, active, created_at as createdAt, updated_at as updatedAt FROM packs'

export class SqlitePackRepository implements PackRepository {
    constructor(private db: Database) {}

    async findById(id: string, restaurantId: string): Promise<Pack | null> {
        const row = await this.db.get<PackRow>(`${SELECT_COLUMNS} WHERE id = ? AND restaurant_id = ?`, [id, restaurantId])
        if (!row) return null
        return this.mapToPack(row, await this.findSlots(row.id))
    }

    async findByRestaurantId(restaurantId: string): Promise<Pack[]> {
        const rows = await this.db.all<PackRow>(`${SELECT_COLUMNS} WHERE restaurant_id = ? ORDER BY name ASC`, [restaurantId])
        const packs: Pack[] = []
        for (const row of rows) {
            packs.push(this.mapToPack(row, await this.findSlots(row.id)))
        }
        return packs
    }

    // Los huecos se reescriben enteros en cada guardado (como dish_ingredients en los platos)
    async save(pack: Pack): Promise<void> {
        const existing = await this.db.get<{ id: string }>('SELECT id FROM packs WHERE id = ? AND restaurant_id = ?', [pack.id, pack.restaurantId])
        if (existing) {
            await this.db.run(
                'UPDATE packs SET name = ?, description = ?, price = ?, active = ?, updated_at = ? WHERE id = ? AND restaurant_id = ?',
                [pack.name, pack.description, pack.price, pack.active ? 1 : 0, pack.updatedAt, pack.id, pack.restaurantId]
            )
        } else {
            await this.db.run(
                'INSERT INTO packs (id, restaurant_id, name, description, price, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [pack.id, pack.restaurantId, pack.name, pack.description, pack.price, pack.active ? 1 : 0, pack.createdAt, pack.updatedAt]
            )
        }

        // pack_slot_dishes se borra en cascada con sus huecos
        await this.db.run('DELETE FROM pack_slots WHERE pack_id = ?', [pack.id])
        for (const [position, slot] of pack.slots.entries()) {
            await this.db.run(
                'INSERT INTO pack_slots (id, pack_id, position, name, category, restriction) VALUES (?, ?, ?, ?, ?, ?)',
                [slot.id, pack.id, position, slot.name, slot.category, slot.restriction]
            )
            for (const dishId of slot.dishIds) {
                await this.db.run('INSERT INTO pack_slot_dishes (slot_id, dish_id) VALUES (?, ?)', [slot.id, dishId])
            }
        }
    }

    async delete(id: string, restaurantId: string): Promise<void> {
        await this.db.run('DELETE FROM packs WHERE id = ? AND restaurant_id = ?', [id, restaurantId])
    }

    private async findSlots(packId: string): Promise<PackSlot[]> {
        const rows = await this.db.all<PackSlotRow>(
            'SELECT id, name, category, restriction FROM pack_slots WHERE pack_id = ? ORDER BY position ASC',
            [packId]
        )
        const slots: PackSlot[] = []
        for (const row of rows) {
            const dishRows = await this.db.all<{ dishId: string }>('SELECT dish_id as dishId FROM pack_slot_dishes WHERE slot_id = ?', [row.id])
            slots.push({
                id: row.id,
                name: row.name,
                category: normalizeDishCategory(row.category),
                restriction: normalizePackRestriction(row.restriction),
                dishIds: dishRows.map(d => d.dishId)
            })
        }
        return slots
    }

    private mapToPack(row: PackRow, slots: PackSlot[]): Pack {
        return {
            id: row.id,
            restaurantId: row.restaurantId,
            name: row.name,
            description: row.description,
            price: row.price,
            active: row.active === 1,
            slots,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt
        }
    }
}
