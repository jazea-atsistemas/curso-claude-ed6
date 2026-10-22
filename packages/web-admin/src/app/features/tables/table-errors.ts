// Los textos de la UI van en español; la API solo garantiza el código HTTP y `error` (nombre de clase).
const MESSAGES: Record<string, string> = {
  DuplicatedTableNumberError: 'Ya existe una mesa con ese número en este restaurante.',
  TableOccupiedError: 'No se puede eliminar una mesa ocupada.',
  TableNumberRequiredError: 'El número de mesa debe ser un entero mayor o igual que 1.',
  InvalidCapacityError: 'La capacidad debe ser un entero mayor o igual que 1.',
  InvalidTableStatusError: 'El estado de la mesa no es válido.',
  TableNotFoundError: 'La mesa no existe.',
  RestaurantNotFoundError: 'El restaurante no existe.'
}

export function tableErrorMessage(err: any, fallback: string): string {
  if (err?.status === 403) return 'No tienes acceso a este restaurante.'
  return MESSAGES[err?.error?.error] ?? fallback
}
