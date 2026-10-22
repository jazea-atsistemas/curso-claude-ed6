// Los textos de la UI van en español; la API solo garantiza el código HTTP y `error` (nombre de clase).
const MESSAGES: Record<string, string> = {
  PackNameRequiredError: 'El pack necesita un nombre.',
  InvalidPriceError: 'El precio debe ser mayor que 0.',
  PackSlotsRequiredError: 'El pack necesita al menos un hueco.',
  InvalidCategoryError: 'La categoría de un hueco no es válida.',
  InvalidPackRestrictionError: 'La restricción de un hueco no es válida.',
  InvalidPackSlotDishError: 'Algún plato marcado no es de la categoría del hueco, o un hueco "solo los marcados" no tiene ninguno.',
  PackNotFoundError: 'El pack no existe.',
  RestaurantNotFoundError: 'El restaurante no existe.'
}

export function packErrorMessage(err: any, fallback: string): string {
  if (err?.status === 403) return 'No tienes acceso a este restaurante.'
  return MESSAGES[err?.error?.error] ?? fallback
}
