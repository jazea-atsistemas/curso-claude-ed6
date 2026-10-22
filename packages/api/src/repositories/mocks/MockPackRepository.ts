import type { PackRepository } from '@repositories/pack.repository.js'
import type { Pack } from '@models/pack.model.js'

const clone = (pack: Pack): Pack => ({ ...pack, slots: pack.slots.map(s => ({ ...s, dishIds: [...s.dishIds] })) })

export class MockPackRepository implements PackRepository {
    private packs: Map<string, Pack> = new Map()

    async findById(id: string, restaurantId: string): Promise<Pack | null> {
        const pack = this.packs.get(id)
        return pack && pack.restaurantId === restaurantId ? clone(pack) : null
    }

    async findByRestaurantId(restaurantId: string): Promise<Pack[]> {
        return Array.from(this.packs.values())
            .filter(p => p.restaurantId === restaurantId)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(clone)
    }

    async save(pack: Pack): Promise<void> {
        this.packs.set(pack.id, clone(pack))
    }

    async delete(id: string, restaurantId: string): Promise<void> {
        if (this.packs.get(id)?.restaurantId === restaurantId) {
            this.packs.delete(id)
        }
    }
}
