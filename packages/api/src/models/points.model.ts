// Regla de puntos de un restaurante: por cada `spendAmount` € gastados
// el cliente gana `pointsAwarded` puntos.
export interface PointsRule {
    restaurantId: string
    spendAmount: number
    pointsAwarded: number
    updatedAt: string
}

// Saldo de puntos de un cliente en un restaurante
export interface ClientPoints {
    clientId: string
    restaurantId: string
    restaurantName?: string
    balance: number
    updatedAt: string
}

// floor(total / X) * Y, calculado en céntimos para evitar errores de coma flotante
export function calculatePointsEarned(total: number, rule: PointsRule | null): number {
    if (!rule || total <= 0) return 0
    const totalCents = Math.round(total * 100)
    const stepCents = Math.round(rule.spendAmount * 100)
    if (stepCents <= 0) return 0
    return Math.floor(totalCents / stepCents) * rule.pointsAwarded
}
