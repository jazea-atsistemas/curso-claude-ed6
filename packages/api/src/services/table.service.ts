import { randomUUID } from 'crypto'
import type { Table } from '@models/table.model.js'
import { normalizeTableStatus } from '@models/table.model.js'
import type { TableRepository } from '@repositories/table.repository.js'
import type { RestaurantRepository } from '@repositories/restaurant.repository.js'
import {
    TableNotFoundError,
    TableNumberRequiredError,
    InvalidCapacityError,
    DuplicatedTableNumberError,
    TableNotAvailableError,
    TableOccupiedError,
    InvalidPeopleCountError,
    RestaurantNotFoundError
} from '@errors/DomainErrors.js'

export interface CreateTableDTO {
    number: number
    description?: string | null
    capacity: number
    status?: string
}

export interface UpdateTableDTO {
    number: number
    description?: string | null
    capacity: number
    status: string
}

export class TableService {
    constructor(
        private readonly tableRepository: TableRepository,
        private readonly restaurantRepository: RestaurantRepository
    ) {}

    async create(restaurantId: string, dto: CreateTableDTO): Promise<Table> {
        const restaurant = await this.restaurantRepository.findById(restaurantId)
        if (!restaurant) {
            throw new RestaurantNotFoundError()
        }

        const now = new Date().toISOString()
        const table = this.buildTable({
            id: randomUUID(),
            restaurantId,
            number: dto.number,
            description: dto.description,
            capacity: dto.capacity,
            status: dto.status ?? 'libre',
            createdAt: now,
            updatedAt: now
        })

        await this.ensureNumberIsFree(table)
        await this.tableRepository.save(table)
        return table
    }

    async update(id: string, restaurantId: string, dto: UpdateTableDTO): Promise<Table> {
        const existing = await this.getById(id, restaurantId)

        const updated = this.buildTable({
            id: existing.id,
            restaurantId: existing.restaurantId,
            number: dto.number,
            description: dto.description,
            capacity: dto.capacity,
            status: dto.status,
            createdAt: existing.createdAt,
            updatedAt: new Date().toISOString()
        })

        await this.ensureNumberIsFree(updated)
        await this.tableRepository.save(updated)
        return updated
    }

    async delete(id: string, restaurantId: string): Promise<void> {
        const existing = await this.getById(id, restaurantId)
        if (existing.status === 'ocupada') {
            throw new TableOccupiedError()
        }
        await this.tableRepository.delete(id, restaurantId)
    }

    async getById(id: string, restaurantId: string): Promise<Table> {
        const table = await this.tableRepository.findById(id, restaurantId)
        if (!table) {
            throw new TableNotFoundError()
        }
        return table
    }

    async findByRestaurantId(restaurantId: string): Promise<Table[]> {
        return this.tableRepository.findByRestaurantId(restaurantId)
    }

    async listAvailable(restaurantId: string, people: number): Promise<Table[]> {
        this.validatePeople(people)
        return this.tableRepository.findAvailable(restaurantId, people)
    }

    async occupy(id: string, restaurantId: string, people: number): Promise<Table> {
        this.validatePeople(people)

        const occupied = await this.tableRepository.occupyIfAvailable(id, restaurantId, people, new Date().toISOString())
        const table = await this.getById(id, restaurantId)
        if (!occupied) {
            throw new TableNotAvailableError()
        }
        return table
    }

    async changeStatus(id: string, restaurantId: string, status: string): Promise<Table> {
        const normalizedStatus = normalizeTableStatus(status)
        const existing = await this.getById(id, restaurantId)

        const updated: Table = {
            ...existing,
            status: normalizedStatus,
            updatedAt: new Date().toISOString()
        }

        await this.tableRepository.save(updated)
        return updated
    }

    private validatePeople(people: number): void {
        if (!Number.isInteger(people) || people < 1) {
            throw new InvalidPeopleCountError()
        }
    }

    private async ensureNumberIsFree(table: Table): Promise<void> {
        const sameNumber = await this.tableRepository.findByNumber(table.restaurantId, table.number)
        if (sameNumber && sameNumber.id !== table.id) {
            throw new DuplicatedTableNumberError(table.number)
        }
    }

    private buildTable(props: {
        id: string
        restaurantId: string
        number: unknown
        description: unknown
        capacity: unknown
        status: string
        createdAt: string
        updatedAt: string
    }): Table {
        if (!Number.isInteger(props.number) || (props.number as number) < 1) {
            throw new TableNumberRequiredError()
        }
        if (!Number.isInteger(props.capacity) || (props.capacity as number) < 1) {
            throw new InvalidCapacityError()
        }

        const description = typeof props.description === 'string' && props.description.trim() !== ''
            ? props.description.trim()
            : null

        return {
            id: props.id,
            restaurantId: props.restaurantId,
            number: props.number as number,
            description,
            capacity: props.capacity as number,
            status: normalizeTableStatus(props.status),
            createdAt: props.createdAt,
            updatedAt: props.updatedAt
        }
    }
}
