/// <reference types="vite/client" />
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import type { Router } from 'express'
import app from './app.js'
import { openApiDocument } from '@config/openapi.js'

// Comprueba que openapi.yaml no se queda desfasado respecto a las rutas reales de la API.

const ALIASES: Record<string, string> = {
    '@routes/': './routes/',
    '@employee/': './contexts/employee/'
}
const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete']
// Rutas que sirven la propia documentación: no se documentan en la especificación
const IGNORED_PATHS = ['/api/openapi.yaml', '/api/openapi.json']

const routerModules = import.meta.glob<{ default: Router }>(
    ['./routes/*.routes.ts', './contexts/*/infrastructure/http/*.routes.ts'],
    { eager: true }
)

// Express ':id' -> OpenAPI '{id}', sin barra final
const toOpenApiPath = (path: string) => {
    const converted = path.replace(/:(\w+)/g, '{$1}').replace(/\/+$/, '')
    return converted === '' ? '/' : converted
}

const routesOf = (router: any, prefix = ''): string[] =>
    router.stack
        .filter((layer: any) => layer.route)
        .flatMap((layer: any) =>
            Object.keys(layer.route.methods)
                .filter(method => HTTP_METHODS.includes(method))
                .map(method => `${method.toUpperCase()} ${toOpenApiPath(prefix + layer.route.path)}`)
        )

// Lee app.ts para saber en qué prefijo se monta cada router
const mountedRoutes = (): string[] => {
    const source = readFileSync(new URL('./app.ts', import.meta.url), 'utf8')
    const imports = new Map<string, string>()
    for (const [, name, specifier] of source.matchAll(/import (\w+) from '([^']+)'/g)) {
        imports.set(name!, specifier!)
    }

    const routes: string[] = []
    for (const [, prefix, name] of source.matchAll(/app\.use\('(\/api\/v1[^']*)', (\w+)\)/g)) {
        const specifier = imports.get(name!)
        expect(specifier, `No se encuentra el import de ${name} en app.ts`).toBeDefined()
        const alias = Object.keys(ALIASES).find(a => specifier!.startsWith(a))
        expect(alias, `Alias no soportado en el test: ${specifier}`).toBeDefined()
        const file = specifier!.replace(alias!, ALIASES[alias!]!).replace(/\.js$/, '.ts')
        const module = routerModules[file]
        expect(module, `No se encuentra el router ${file}`).toBeDefined()
        routes.push(...routesOf(module!.default, prefix))
    }
    return routes
}

const appRoutes = (): string[] =>
    [...mountedRoutes(), ...routesOf((app as any).router)]
        .filter(route => !IGNORED_PATHS.some(path => route.endsWith(` ${path}`)))

const documentedRoutes = (): string[] =>
    Object.entries(openApiDocument.paths as Record<string, Record<string, unknown>>)
        .flatMap(([path, item]) =>
            Object.keys(item)
                .filter(method => HTTP_METHODS.includes(method))
                .map(method => `${method.toUpperCase()} ${path}`)
        )

describe('openapi.yaml', () => {
    it('es un documento OpenAPI 3 con rutas y esquemas', () => {
        expect(openApiDocument.openapi).toMatch(/^3\./)
        expect(Object.keys(openApiDocument.paths).length).toBeGreaterThan(0)
        expect(openApiDocument.components.securitySchemes.bearerAuth).toMatchObject({ type: 'http', scheme: 'bearer' })
    })

    it('documenta todas las rutas que monta app.ts', () => {
        const documented = new Set(documentedRoutes())
        const missing = appRoutes().filter(route => !documented.has(route))
        expect(missing, 'Rutas sin documentar en openapi.yaml').toEqual([])
    })

    it('no documenta rutas que no existen', () => {
        const existing = new Set(appRoutes())
        const extra = documentedRoutes().filter(route => !existing.has(route))
        expect(extra, 'Rutas de openapi.yaml que no existen en la API').toEqual([])
    })

    it('todas las referencias $ref apuntan a componentes existentes', () => {
        const refs = JSON.stringify(openApiDocument).match(/"\$ref":"#\/components\/[^"]+"/g) ?? []
        for (const ref of refs) {
            const [, , section, name] = ref.slice(9, -1).split('/')
            expect(openApiDocument.components[section!]?.[name!], ref).toBeDefined()
        }
    })
})
