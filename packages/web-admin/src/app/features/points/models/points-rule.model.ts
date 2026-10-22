// Por cada spendAmount € gastados, el cliente gana pointsAwarded puntos
export interface PointsRule {
  restaurantId: string
  spendAmount: number
  pointsAwarded: number
  updatedAt: string
}

export interface SavePointsRuleDto {
  spendAmount: number
  pointsAwarded: number
}
