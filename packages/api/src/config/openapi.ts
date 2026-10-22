import { readFileSync } from 'node:fs'
import { parse } from 'yaml'

// La especificación se mantiene a mano en packages/api/openapi.yaml
export const OPENAPI_PATH = new URL('../../openapi.yaml', import.meta.url)

export const openApiYaml: string = readFileSync(OPENAPI_PATH, 'utf8')
export const openApiDocument: Record<string, any> = parse(openApiYaml)
