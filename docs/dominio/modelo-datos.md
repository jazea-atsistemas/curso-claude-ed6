# Modelo de Datos

Esquema de la base de datos SQLite de Resttek.

---

## Diagrama Entidad-Relación

```mermaid
erDiagram
    restaurants ||--o{ employees : "tiene"
    restaurants ||--o{ ingredients : "tiene"
    restaurants ||--o{ dishes : "tiene"
    restaurants ||--o{ orders : "tiene"
    restaurants ||--o{ tables : "tiene"
    tables |o--o{ orders : "asociada a"
    dishes ||--o{ dish_ingredients : "contiene"
    ingredients ||--o{ dish_ingredients : "usado en"
    orders ||--o{ order_items : "contiene"
    dishes ||--o{ order_items : "pedido como"
    restaurants ||--o| points_rules : "configura"
    restaurants ||--o{ client_points : "acumula"
    employees ||--o{ client_points : "tiene saldo"

    restaurants {
        TEXT id PK
        TEXT name
        TEXT address
        TEXT email
        TEXT phone
        TEXT owner_first_name
        TEXT owner_last_name
        TEXT logo_url
        TEXT created_at
        TEXT updated_at
    }

    employees {
        TEXT id PK
        TEXT first_name
        TEXT last_name
        TEXT email UK
        TEXT password_hash
        TEXT role
        TEXT restaurant_id FK
    }

    ingredients {
        TEXT id PK
        TEXT name
        TEXT unit
        REAL current_stock
        TEXT restaurant_id FK
        TEXT created_at
        TEXT updated_at
    }

    dishes {
        TEXT id PK
        TEXT name
        TEXT description
        REAL price
        TEXT category
        INTEGER available
        TEXT restaurant_id FK
        TEXT created_at
        TEXT updated_at
    }

    dish_ingredients {
        TEXT dish_id PK_FK
        TEXT ingredient_id PK_FK
        REAL quantity
    }

    tables {
        TEXT id PK
        TEXT restaurant_id FK
        INTEGER number
        TEXT description
        INTEGER capacity
        TEXT status
        TEXT created_at
        TEXT updated_at
    }

    orders {
        TEXT id PK
        TEXT restaurant_id FK
        TEXT table_id
        TEXT client_id
        TEXT created_at
        REAL total
        INTEGER points_earned
        TEXT billed_at
    }

    points_rules {
        TEXT restaurant_id PK_FK
        REAL spend_amount
        INTEGER points_awarded
        TEXT updated_at
    }

    client_points {
        TEXT client_id PK_FK
        TEXT restaurant_id PK_FK
        INTEGER balance
        TEXT updated_at
    }

    order_items {
        TEXT id PK
        TEXT order_id FK
        TEXT dish_id FK
        INTEGER quantity
        TEXT notes
        TEXT status
    }
```

---

## Tablas

### `restaurants`

Almacena la información de los restaurantes.

| Columna | Tipo | Nullable | Descripción |
| --- | --- | --- | --- |
| `id` | TEXT | No | UUID, clave primaria |
| `name` | TEXT | No | Nombre del restaurante |
| `address` | TEXT | No | Dirección |
| `email` | TEXT | No | Email de contacto |
| `phone` | TEXT | No | Teléfono |
| `owner_first_name` | TEXT | No | Nombre del propietario |
| `owner_last_name` | TEXT | No | Apellido del propietario |
| `logo_url` | TEXT | Sí | URL del logo |
| `created_at` | TEXT | No | Fecha de creación (ISO 8601) |
| `updated_at` | TEXT | No | Fecha de última actualización |

---

### `employees`

Almacena **todos** los usuarios del sistema, incluidos los clientes: no hay tabla de clientes aparte. Un cliente es una fila con `role = 'cliente'` y `restaurant_id` a null.

| Columna | Tipo | Nullable | Descripción |
| --- | --- | --- | --- |
| `id` | TEXT | No | UUID, clave primaria |
| `first_name` | TEXT | No | Nombre |
| `last_name` | TEXT | No | Apellido |
| `email` | TEXT | No | Email (único) |
| `password_hash` | TEXT | No | Hash bcrypt de la contraseña |
| `role` | TEXT | No | Rol: admin, manager, camarero, cocinero, cliente |
| `restaurant_id` | TEXT | Sí | FK → `restaurants.id` (null para admin y cliente) |

**Restricciones:**

- `email` es UNIQUE.
- `restaurant_id` es FK a `restaurants.id`.

---

### `ingredients`

Ingredientes disponibles en cada restaurante.

| Columna | Tipo | Nullable | Descripción |
| --- | --- | --- | --- |
| `id` | TEXT | No | UUID, clave primaria |
| `name` | TEXT | No | Nombre del ingrediente |
| `unit` | TEXT | No | Unidad: kg, g, l, ml, unidad |
| `current_stock` | REAL | No | Stock actual (default: 0) |
| `restaurant_id` | TEXT | No | FK → `restaurants.id` |
| `created_at` | TEXT | No | Fecha de creación |
| `updated_at` | TEXT | No | Fecha de última actualización |

---

### `dishes`

Platos de la carta de cada restaurante.

| Columna | Tipo | Nullable | Descripción |
| --- | --- | --- | --- |
| `id` | TEXT | No | UUID, clave primaria |
| `name` | TEXT | No | Nombre del plato |
| `description` | TEXT | Sí | Descripción |
| `price` | REAL | No | Precio en euros |
| `category` | TEXT | No | Categoría: entrante, principal, postre, bebida |
| `available` | INTEGER | No | Disponibilidad: 1 = sí, 0 = no (default: 1) |
| `restaurant_id` | TEXT | No | FK → `restaurants.id` |
| `created_at` | TEXT | No | Fecha de creación |
| `updated_at` | TEXT | No | Fecha de última actualización |

---

### `dish_ingredients`

Relación muchos-a-muchos entre platos e ingredientes.

| Columna | Tipo | Nullable | Descripción |
| --- | --- | --- | --- |
| `dish_id` | TEXT | No | FK → `dishes.id` (PK compuesta) |
| `ingredient_id` | TEXT | No | FK → `ingredients.id` (PK compuesta) |
| `quantity` | REAL | No | Cantidad del ingrediente necesaria |

**Restricciones:**

- PK compuesta: (`dish_id`, `ingredient_id`).
- FK a `dishes.id` **con** `ON DELETE CASCADE`: al borrar un plato desaparecen sus ingredientes asociados.
- FK a `ingredients.id` **sin** cascada.

---

### `tables`

Mesas de cada restaurante.

| Columna | Tipo | Nullable | Descripción |
| --- | --- | --- | --- |
| `id` | TEXT | No | UUID, clave primaria (el seed usa IDs fijos: `rest-1-mesa-1`…) |
| `restaurant_id` | TEXT | No | FK → `restaurants.id` |
| `number` | INTEGER | No | Número visible de la mesa (≥ 1) |
| `description` | TEXT | Sí | Descripción (ej: "Terraza") |
| `capacity` | INTEGER | No | Número máximo de comensales (≥ 1) |
| `status` | TEXT | No | Estado: libre, ocupada, reservada (default: libre) |
| `created_at` | TEXT | No | Fecha de creación |
| `updated_at` | TEXT | No | Fecha de última actualización |

**Restricciones:**

- UNIQUE (`restaurant_id`, `number`): el número de mesa no se repite dentro de un restaurante.
- `restaurant_id` es FK a `restaurants.id`.

---

### `orders`

Pedidos de los clientes.

| Columna | Tipo | Nullable | Descripción |
| --- | --- | --- | --- |
| `id` | TEXT | No | UUID, clave primaria |
| `restaurant_id` | TEXT | No | FK → `restaurants.id` |
| `table_id` | TEXT | Sí | ID de la mesa (`tables.id`, opcional). **Sin FK**: la integridad la valida `OrderService` al crear el pedido |
| `client_id` | TEXT | Sí | ID del cliente (opcional) |
| `created_at` | TEXT | No | Fecha de creación |
| `total` | REAL | Sí | Importe cobrado en euros. Se rellena al pedir la cuenta |
| `points_earned` | INTEGER | Sí | Puntos que ganó el cliente con este pedido. Se rellena al pedir la cuenta |
| `billed_at` | TEXT | Sí | Fecha en que se pidió la cuenta. `null` = pedido sin cobrar; solo se puede pedir una vez |

`total`, `points_earned` y `billed_at` se añadieron después de crear la tabla: `runInitialMigrations()` las añade con `ALTER TABLE ... ADD COLUMN` si faltan, así que una base de datos existente no hay que recrearla.

---

### `order_items`

Líneas de pedido. Cada ítem es un plato con cantidad y estado.

| Columna | Tipo | Nullable | Descripción |
| --- | --- | --- | --- |
| `id` | TEXT | No | UUID, clave primaria |
| `order_id` | TEXT | No | FK → `orders.id` |
| `dish_id` | TEXT | No | FK → `dishes.id` |
| `quantity` | INTEGER | No | Cantidad pedida |
| `notes` | TEXT | Sí | Notas del cliente (ej: "sin gluten") |
| `status` | TEXT | No | Estado: pendiente, preparando, listo, entregado |

**Restricciones:**

- ON DELETE CASCADE desde `orders.id`.

---

### `points_rules`

Regla de puntos de cada restaurante: por cada `spend_amount` € gastados el cliente gana `points_awarded` puntos. Un restaurante sin fila no da puntos.

| Columna | Tipo | Nullable | Descripción |
| --- | --- | --- | --- |
| `restaurant_id` | TEXT | No | PK y FK → `restaurants.id` (una regla por restaurante) |
| `spend_amount` | REAL | No | Euros por tramo (X), ≥ 0,01 |
| `points_awarded` | INTEGER | No | Puntos por tramo (Y), ≥ 1 |
| `updated_at` | TEXT | No | Fecha de última modificación |

---

### `client_points`

Saldo de puntos de cada cliente en cada restaurante. La fila se crea la primera vez que el cliente gana puntos en ese restaurante.

| Columna | Tipo | Nullable | Descripción |
| --- | --- | --- | --- |
| `client_id` | TEXT | No | FK → `employees.id` (un cliente es un `employee` con rol `cliente`) |
| `restaurant_id` | TEXT | No | FK → `restaurants.id` |
| `balance` | INTEGER | No | Puntos disponibles (default: 0) |
| `updated_at` | TEXT | No | Fecha del último movimiento |

**Restricciones:**

- PK compuesta: (`client_id`, `restaurant_id`). Los puntos de un restaurante no valen en otro.

---

## Relaciones

| Relación | Tipo | Descripción |
| --- | --- | --- |
| Restaurant → Employees | 1:N | Un restaurante tiene muchos empleados |
| Restaurant → Ingredients | 1:N | Un restaurante tiene muchos ingredientes |
| Restaurant → Dishes | 1:N | Un restaurante tiene muchos platos |
| Restaurant → Orders | 1:N | Un restaurante tiene muchos pedidos |
| Restaurant → Tables | 1:N | Un restaurante tiene muchas mesas |
| Table → Orders | 1:N | Una mesa puede tener varios pedidos (por `orders.table_id`, sin FK) |
| Dish ↔ Ingredient | N:M | Un plato usa varios ingredientes (via `dish_ingredients`) |
| Order → OrderItems | 1:N | Un pedido tiene varios ítems |
| Dish → OrderItems | 1:N | Un plato puede estar en varios ítems de pedido |
| Restaurant → PointsRule | 1:0..1 | Un restaurante tiene como mucho una regla de puntos |
| Employee (cliente) ↔ Restaurant | N:M | Saldo de puntos por cliente y restaurante (via `client_points`) |

---

## Notas Técnicas

- **IDs**: Todos son UUID v4 generados con `crypto.randomUUID()`. Excepción: el script de seed usa los identificadores fijos `rest-1` y `rest-2` para los restaurantes de prueba, y `rest-1-mesa-1`…`rest-1-mesa-6` y `rest-2-mesa-1`…`rest-2-mesa-4` para sus mesas.
- **Seed de puntos**: el seed crea una regla para cada restaurante de prueba (`rest-1`: 10 € → 1 punto; `rest-2`: 5 € → 1 punto) y ningún saldo. `TABLES_TO_CLEAR` vacía `client_points` y `points_rules` antes que sus tablas padre.
- **Fechas**: Almacenadas como TEXT en formato ISO 8601 (`new Date().toISOString()`).
- **Booleanos**: SQLite no tiene tipo BOOLEAN; se usa INTEGER (0 = false, 1 = true).
- **Nomenclatura**: las columnas son `snake_case` y las propiedades TypeScript `camelCase`. La conversión se hace con alias en el propio SQL (`owner_first_name as ownerFirstName`).
- **Migraciones**: Las tablas se crean automáticamente en `Database.initialize()` con `CREATE TABLE IF NOT EXISTS`.
- **Sin migrations framework**: No se usa un sistema de migraciones formal. Los cambios de esquema se hacen modificando `runInitialMigrations()`. `CREATE TABLE IF NOT EXISTS` **no modifica una tabla ya creada**: para añadir una columna a una tabla existente hay que añadirla también con `addColumnIfMissing(tabla, columna, tipo)` al final de `runInitialMigrations()` (comprueba `PRAGMA table_info` y hace `ALTER TABLE ... ADD COLUMN` solo si falta), como con `orders.total`. Una tabla nueva (como `tables` o `points_rules`) sí se crea al arrancar sobre una base de datos existente.
- **`orders.table_id` sin FK**: SQLite no permite añadir una FK con `ALTER TABLE`, y `CREATE TABLE IF NOT EXISTS` no modifica tablas existentes. Los pedidos antiguos con un `table_id` que no es una mesa (p. ej. `'5'`) devuelven `tableNumber: null`.