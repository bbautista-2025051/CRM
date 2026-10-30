# Nexo CRM — Modelo de datos (ERD)

Fuente de verdad: [`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma).
Motor: **PostgreSQL**. Los nombres de tabla y columna se mapean a `snake_case` con
`@@map` / `@map`.

## 1. Diagrama entidad‑relación

```mermaid
erDiagram
    users ||--o{ sessions : "abre"
    users ||--o{ activity_logs : "genera"
    users ||--o{ companies : "crea"
    users ||--o{ opportunities : "responsable"
    users ||--o{ sales : "responsable"

    companies ||--o{ clients : "tiene"
    companies ||--o{ opportunities : "origen"
    companies ||--o{ sales : "factura"

    clients ||--o{ opportunities : "contacto"
    clients ||--o{ sales : "compra"

    opportunities |o--o| sales : "origina"

    users {
        uuid id PK
        varchar(120) name
        varchar(255) email UK
        varchar(255) password_hash "nullable (solo Google)"
        enum role "ADMIN | VENDEDOR"
        enum status "ACTIVE | INACTIVE"
        varchar(500) avatar_url
        varchar(255) google_id UK "nullable"
        enum theme_preference "LIGHT | DARK | SYSTEM"
        boolean must_change_password
        timestamptz last_login_at
        timestamptz created_at
        timestamptz updated_at
    }

    sessions {
        uuid id PK
        varchar(64) token_hash UK
        varchar(64) csrf_token
        uuid user_id FK
        timestamptz expires_at
        boolean remember_me
        varchar(64) ip_address
        varchar(500) user_agent
        timestamptz last_seen_at
        timestamptz created_at
    }

    activity_logs {
        uuid id PK
        uuid user_id FK "nullable, SET NULL"
        varchar(40) action
        varchar(40) entity_type
        uuid entity_id "nullable, polimórfico"
        varchar(300) description
        jsonb metadata
        timestamptz created_at
    }

    companies {
        uuid id PK
        varchar(160) name
        varchar(200) legal_name
        varchar(40) tax_id UK "nullable"
        varchar(100) sector
        varchar(255) email
        varchar(40) phone
        varchar(300) address
        varchar(300) website
        enum status "ACTIVE | ARCHIVED"
        text notes
        uuid created_by_id FK "nullable, SET NULL"
        timestamptz created_at
        timestamptz updated_at
    }

    clients {
        uuid id PK
        varchar(80) first_name
        varchar(80) last_name
        varchar(255) email UK
        varchar(40) phone
        varchar(120) job_title
        uuid company_id FK "nullable, SET NULL"
        enum status "ACTIVE | ARCHIVED"
        text notes
        timestamptz created_at
        timestamptz updated_at
    }

    opportunities {
        uuid id PK
        varchar(180) name
        text description
        uuid company_id FK "nullable, SET NULL"
        uuid client_id FK "nullable, SET NULL"
        uuid owner_id FK "RESTRICT"
        decimal(14_2) value
        int probability "0-100"
        date expected_close_date
        enum stage "PROSPECTO..PERDIDA"
        enum status "OPEN | WON | LOST"
        timestamptz won_at
        timestamptz lost_at
        timestamptz created_at
        timestamptz updated_at
    }

    sales {
        uuid id PK
        varchar(30) sale_number UK
        uuid company_id FK "nullable, SET NULL"
        uuid client_id FK "nullable, SET NULL"
        uuid opportunity_id FK "nullable, SET NULL, UNIQUE"
        uuid owner_id FK "RESTRICT"
        date sale_date
        decimal(14_2) amount
        varchar(3) currency "ISO-4217"
        enum status "PENDING | CONFIRMED | CANCELLED"
        text notes
        timestamptz created_at
        timestamptz updated_at
    }
```

## 2. Enums

| Enum | Valores |
| --- | --- |
| `Role` | `ADMIN`, `VENDEDOR` |
| `UserStatus` | `ACTIVE`, `INACTIVE` |
| `ThemePreference` | `LIGHT`, `DARK`, `SYSTEM` |
| `CompanyStatus` | `ACTIVE`, `ARCHIVED` |
| `ClientStatus` | `ACTIVE`, `ARCHIVED` |
| `OpportunityStage` | `PROSPECTO`, `CALIFICACION`, `PROPUESTA`, `NEGOCIACION`, `GANADA`, `PERDIDA` |
| `OpportunityStatus` | `OPEN`, `WON`, `LOST` |
| `SaleStatus` | `PENDING`, `CONFIRMED`, `CANCELLED` |

## 3. Claves, restricciones e índices

### `users`

| Tipo | Definición |
| --- | --- |
| PK | `id` (uuid) |
| UNIQUE | `email`, `google_id` |
| NOT NULL | `name`, `email`, `role`, `status`, `theme_preference`, `must_change_password`, `created_at`, `updated_at` |
| Índices | `(role)`, `(status)` |

`password_hash` es opcional porque una cuenta puede existir solo con Google vinculado,
pero el sistema exige al menos un método de acceso (contraseña o `google_id`).

### `sessions`

| Tipo | Definición |
| --- | --- |
| PK | `id` |
| UNIQUE | `token_hash` |
| FK | `user_id → users.id` `ON DELETE CASCADE` |
| Índices | `(user_id)`, `(expires_at)` |

El token en claro nunca se almacena: solo el HMAC-SHA256. `csrf_token` es un valor
aleatorio por sesión; `remember_me` fija la expiración (8 h por defecto frente a 30 días).

### `activity_logs`

| Tipo | Definición |
| --- | --- |
| PK | `id` |
| FK | `user_id → users.id` `ON DELETE SET NULL` |
| Índices | `(entity_type, entity_id)`, `(created_at)`, `(user_id)` |

`entity_id` es polimórfico (no tiene FK) para permitir auditar entidades eliminadas.
`metadata` guarda datos puntuales (por ejemplo, el número de venta o el importe).

### `companies`

| Tipo | Definición |
| --- | --- |
| PK | `id` |
| UNIQUE | `tax_id` (NIT / identificación fiscal) |
| FK | `created_by_id → users.id` `ON DELETE SET NULL` |
| NOT NULL | `name`, `status`, `created_at`, `updated_at` |
| Índices | `(name)`, `(sector)`, `(status)` |

### `clients`

| Tipo | Definición |
| --- | --- |
| PK | `id` |
| UNIQUE | `email` |
| FK | `company_id → companies.id` `ON DELETE SET NULL` |
| NOT NULL | `first_name`, `last_name`, `email`, `status`, `created_at`, `updated_at` |
| Índices | `(last_name, first_name)`, `(company_id)`, `(status)` |

Un cliente puede existir sin empresa (contacto independiente); si la empresa se eliminara
por mantenimiento, el contacto se conserva. La API no permite borrar empresas/clientes
con actividad: solo archivarlas.

### `opportunities`

| Tipo | Definición |
| --- | --- |
| PK | `id` |
| FK | `company_id → companies.id` `SET NULL`; `client_id → clients.id` `SET NULL`; `owner_id → users.id` `RESTRICT` |
| NOT NULL | `name`, `owner_id`, `value`, `probability`, `stage`, `status`, `created_at`, `updated_at` |
| CHECK (aplicado en servicio) | `value > 0`; `0 <= probability <= 100` |
| Índices | `(stage)`, `(status)`, `(owner_id)`, `(company_id)`, `(client_id)`, `(expected_close_date)` |

`ON DELETE RESTRICT` en `owner_id` impide eliminar usuarios con oportunidades asignadas
(se desactivan en su lugar). `won_at`/`lost_at` se completan al pasar a `GANADA`/`PERDIDA`
y se limpian al reabrir la oportunidad.

### `sales`

| Tipo | Definición |
| --- | --- |
| PK | `id` |
| UNIQUE | `sale_number`, `opportunity_id` (una oportunidad ⇒ como máximo una venta) |
| FK | `company_id`/`client_id` `SET NULL`; `opportunity_id` `SET NULL`; `owner_id → users.id` `RESTRICT` |
| NOT NULL | `sale_number`, `owner_id`, `sale_date`, `amount`, `currency`, `status`, `created_at`, `updated_at` |
| CHECK (aplicado en servicio) | `amount > 0`; `currency` ISO de 3 letras |
| Índices | `(status)`, `(sale_date)`, `(owner_id)`, `(client_id)`, `(company_id)` |

La numeración se genera con la secuencia PostgreSQL creada en la migración
`20261029174000_add_sale_number_sequence`:

```sql
CREATE SEQUENCE IF NOT EXISTS sale_number_seq START 1;

-- Por cada venta nueva (dentro de la misma transacción):
SELECT nextval('sale_number_seq');
-- sale_number = 'V-' || año || '-' || lpad(valor, 5, '0')
```

## 4. Reglas de borrado y ciclo de vida

| Entidad | Borrado físico | Alternativa |
| --- | --- | --- |
| `users` | Solo si no tiene oportunidades/ventas (RESTRICT) | `status = INACTIVE` |
| `sessions` | Sí (al cerrar sesión, revocar o expirar) | — |
| `activity_logs` | No se eliminan por API | — |
| `companies` | Bloqueado por API | `status = ARCHIVED` |
| `clients` | Bloqueado por API | `status = ARCHIVED` |
| `opportunities` | Solo si no tiene venta asociada | `stage = PERDIDA` |
| `sales` | Bloqueado por API | `status = CANCELLED` |

## 5. Migraciones

| Migración | Contenido |
| --- | --- |
| `20261029173755_init` | Enums, 6 tablas, llaves, únicos, índices y relaciones con sus políticas de borrado. |
| `20261029174000_add_sale_number_sequence` | Secuencia `sale_number_seq` para numerar ventas de forma atómica. |

Comandos:

```bash
pnpm db:migrate    # desarrollo (crea migración si cambia el esquema)
pnpm db:deploy     # aplica migraciones existentes (CI/producción)
```

> El ERD anterior muestra tipos lógicos. En PostgreSQL, los `DateTime` de Prisma se
> materializan como `timestamp(3)` y las fechas civiles (`expected_close_date`,
> `sale_date`) como `date`.
