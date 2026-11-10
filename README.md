# Softplus

CRM web full stack para gestionar empresas, clientes, oportunidades y ventas, con
autenticación por sesión, control de acceso por roles, auditoría de actividad y
tablero comercial.

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS + TanStack Query + Recharts.
- **Backend:** Node.js + TypeScript + Express + Prisma + PostgreSQL.
- **Seguridad:** Argon2id, sesiones opacas en servidor, CSRF por sesión, rate limiting,
  validación con Zod en ambos lados.

> Documentación complementaria: [Informe técnico](docs/TECHNICAL_REPORT.md) ·
> [Modelo de datos / ERD](docs/ERD.md) · Swagger en `http://localhost:4000/api/docs`.

---

## 1. Funcionalidades

| Módulo | Qué incluye |
| --- | --- |
| Panel | KPIs (ingresos confirmados, pipeline abierto, conversión, clientes), gráfico de ingresos de 6 meses, embudo por etapa, oportunidades y actividad recientes. |
| Empresas | CRUD, filtros por estado/sector, búsqueda, detalle con clientes, oportunidades y ventas, archivado lógico. |
| Clientes | CRUD, filtros por estado/empresa, búsqueda, detalle con oportunidades y ventas, archivado lógico. |
| Negocio | Oportunidades con vista tabla y **Kanban** por etapa, filtros, importe, probabilidad, fecha estimada y cierre automático por etapa; ventas con registro desde oportunidades ganadas o de forma manual, numeración `V-AAAA-00001`, confirmación (solo administrador), cancelación con confirmación explícita y resumen por moneda. |
| Usuarios | Exclusivo de administradores: alta, edición, rol, estado, reseteo de contraseña temporal. |
| Configuración | Perfil, avatar, cambio de contraseña, tema (claro/oscuro/sistema), sesiones activas, vinculación de Google. |
| Actividad | Auditoría filtrable por entidad de todas las acciones relevantes. |

Detalles de producto:

- Tema claro, oscuro y **sistema**, persistido por usuario en la base de datos y en
  `localStorage` para evitar el parpadeo inicial.
- Diseño responsive con navegación lateral colapsable.
- Mensajes de error de validación por campo provenientes del backend.
- Estados vacíos, esqueletos de carga y confirmaciones antes de acciones destructivas.

## 2. Estructura del repositorio

```
CRM/
├─ backend/                  API REST (@nexo/backend)
│  ├─ prisma/
│  │  ├─ schema.prisma       Modelo relacional
│  │  ├─ migrations/         Migraciones SQL versionadas
│  │  └─ seed.ts             Datos de demostración (opcional)
│  ├─ scripts/create-admin.ts Primer administrador
│  └─ src/
│     ├─ modules/            auth, users, companies, clients, opportunities, sales, dashboard, settings, activity
│     ├─ middlewares/        auth, RBAC, CSRF, validación, rate limit, origen, errores, uploads
│     ├─ utils/              sesiones, contraseñas, paginación, serializadores, auditoría
│     ├─ docs/openapi.ts     Documento OpenAPI 3
│     └─ tests/              Pruebas de integración (Vitest + Supertest)
├─ frontend/                 SPA React (@nexo/frontend)
│  └─ src/
│     ├─ pages/              Vistas por módulo
│     ├─ components/         UI, layout, formularios y modales
│     ├─ hooks/              Consultas y mutaciones (TanStack Query)
│     ├─ lib/                Cliente HTTP, validaciones, permisos, formato
│     └─ providers/          Sesión, tema, toasts, confirmaciones
├─ docs/                     Informe técnico y ERD
├─ docker-compose.yml        PostgreSQL opcional para desarrollo
├─ .env.example              Plantilla de configuración
└─ pnpm-workspace.yaml
```

## 3. Requisitos

- Node.js **>= 20.19**
- pnpm **11.x** (`corepack enable` y luego `corepack prepare pnpm@11.17.0 --activate`)
- PostgreSQL **14+** (probado con PostgreSQL 18)

## 4. Puesta en marcha

```bash
# 1. Dependencias
pnpm install

# 2. Configuración
cp .env.example .env
#   Edita .env:
#   - DATABASE_URL con tus credenciales
#   - SESSION_SECRET (32+ caracteres aleatorios)
#   - ADMIN_NAME / ADMIN_EMAIL / ADMIN_PASSWORD

# 3. Base de datos (crea las dos bases si no existen)
createdb -U postgres crm_dev
createdb -U postgres crm_test

# 4. Esquema y cliente Prisma
pnpm db:migrate          # desarrollo: aplica migraciones
# pnpm db:deploy         # producción/CI: solo aplica migraciones existentes

# 5. Primer administrador (no hay credenciales por defecto)
pnpm create-admin

# 6. Servidores de desarrollo (API en :4000, web en :5173)
pnpm dev
```

- Aplicación: <http://localhost:5173>
- API: <http://localhost:4000/api/health>
- Swagger UI: <http://localhost:4000/api/docs>
- OpenAPI JSON: <http://localhost:4000/api/openapi.json>

> Si usas Docker para la base de datos: `docker compose up -d` levanta PostgreSQL 16
> en `localhost:5432` con usuario `postgres`, contraseña `postgres` y base `crm_dev`.
> Ajusta `DATABASE_URL` en consecuencia.

### Producción

```bash
pnpm build                  # compila backend (tsc) y frontend (vite build)
pnpm db:deploy              # migraciones en la base productiva
pnpm start                  # node dist/server.js
```

Sirve `frontend/dist` con tu hosting estático y publica `/api` y `/uploads` hacia el
backend (reverse proxy). En producción configura `COOKIE_SECURE=true` (HTTPS
obligatorio), `NODE_ENV=production`, `TRUST_PROXY=true` si hay proxy y `APP_URL` /
`CORS_ORIGINS` con el dominio real.

## 5. Variables de entorno

Todas se validan al arrancar (`backend/src/config/env.ts`); si falta o es inválida una
obligatoria, el servidor no inicia y muestra el listado de errores sin filtrar secretos.

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `DATABASE_URL` | Sí | Cadena de conexión PostgreSQL (`?schema=public`). |
| `TEST_DATABASE_URL` | No | Referencia para crear `backend/.env.test` (base aislada de pruebas). |
| `NODE_ENV` | No | `development` \| `test` \| `production` (por defecto `development`). |
| `PORT` | No | Puerto de la API (por defecto `4000`). |
| `APP_URL` | No | URL del frontend; se usa en enlaces y en la validación de origen. |
| `CORS_ORIGINS` | No | Lista separada por comas de orígenes permitidos. |
| `TRUST_PROXY` | No | `true` si la API está detrás de un proxy inverso. |
| `SESSION_SECRET` | Sí | 32+ caracteres; deriva el HMAC de los tokens de sesión. |
| `SESSION_COOKIE_NAME` | No | Nombre de la cookie (por defecto `nexo_session`). |
| `SESSION_TTL_HOURS` | No | Duración sin «Recuérdame» (por defecto 8). |
| `SESSION_REMEMBER_DAYS` | No | Duración con «Recuérdame» (por defecto 30). |
| `COOKIE_SECURE` | No | `true` obliga a cookies `Secure` (producción). |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | No | Habilita el acceso con Google. Vacías = función deshabilitada. |
| `UPLOAD_DIR` | No | Carpeta de avatares (por defecto `uploads`). |
| `MAX_AVATAR_SIZE_MB` | No | Tamaño máximo de avatar (1–10, por defecto 2). |
| `DEFAULT_CURRENCY` | No | Moneda base para importes y totales (por defecto `GTQ`). |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Solo script | Datos usados por `pnpm create-admin`. |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` / `SEED_DEMO_DATA` | No | Seed de demostración opcional. |
| `VITE_API_URL` | No | Base de la API en el frontend (vacío = mismo origen vía proxy). |
| `VITE_COMPANY_NAME` / `VITE_CRM_NAME` / `VITE_LOGO_URL` | No | Personalización de marca. |

Genera un secreto de sesión con:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

## 6. Primer administrador

No existen usuarios ni contraseñas por defecto en el código. El script crea la cuenta
con `mustChangePassword = true`, de modo que el sistema muestra un aviso para cambiarla:

```bash
# Define ADMIN_NAME, ADMIN_EMAIL y ADMIN_PASSWORD en .env y ejecuta:
pnpm create-admin
```

El script valida los datos con el mismo esquema de contraseñas del registro (mínimo 10
caracteres, mayúscula, minúscula y número), rechaza correos ya existentes y **nunca**
imprime la contraseña en la salida.

Datos de demostración (opcional, solo con `SEED_DEMO_DATA=true`):

```bash
pnpm db:seed
```

## 7. Autenticación

- **Correo y contraseña** con hash **Argon2id**.
- **Sesiones en servidor**: se genera un token aleatorio de 32 bytes, se envía al
  navegador en una cookie `HttpOnly` y en la base de datos solo se guarda su
  HMAC-SHA256. Cerrar sesión o revocar una sesión invalida la cookie de inmediato.
- **Recuérdame**: activa una sesión de 30 días (`SESSION_REMEMBER_DAYS`) frente a las
  8 horas (`SESSION_TTL_HOURS`) de una sesión normal. La duración se guarda por sesión.
- **CSRF**: cada sesión tiene un token propio; el frontend lo guarda en memoria y lo
  envía en `X-CSRF-Token` en todas las mutaciones. El backend lo exige y además valida
  el encabezado `Origin` contra la lista permitida.
- **Cookies**: `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` cuando `COOKIE_SECURE=true`.
- **Rate limiting**: límite global por IP y límites más estrictos en login y cambio de
  contraseña.

### Google (OIDC) — configuración

1. En Google Cloud Console crea un **OAuth Client ID** de tipo *Web application*.
2. Añade como *Authorized JavaScript origin* la URL del frontend
   (por ejemplo `http://localhost:5173` y, en producción, tu dominio).
3. Copia el Client ID y el Client Secret a `.env`:
   `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`.
4. Reinicia la API. El botón de Google aparece cuando `/api/auth/google/status`
   informa `enabled: true`.

Reglas de negocio:

- **Nunca** se crea un usuario desde Google. El acceso solo funciona si el usuario ya
  existe en el CRM y tiene una cuenta de Google vinculada (`google_id`).
- La vinculación se hace desde **Configuración → Google**, exige sesión iniciada y que
  el correo verificado de Google coincida exactamente con el correo del CRM.
- Si el usuario vinculado no tiene contraseña, puede desvincular Google; si aún tiene
  contraseña, puede desvincular cuando quiera.

> ⚠️ **Estado de verificación:** la integración está implementada (verificación del ID
> token con `google-auth-library`, vinculación y desvinculación), pero **no se probó en
> vivo** porque el entorno de desarrollo no dispone de credenciales OAuth. Está
> documentada como no verificada en el informe técnico.

## 8. Roles y permisos

| Acción | ADMIN | VENDEDOR |
| --- | :---: | :---: |
| Ver panel, empresas, clientes, oportunidades, ventas y actividad | ✅ | ✅ |
| Crear/editar empresas y clientes | ✅ | ✅ |
| Archivar o reactivar empresas y clientes | ✅ | ❌ |
| Crear oportunidades | ✅ | ✅ |
| Editar/eliminar oportunidades propias (sin venta asociada) | ✅ | ✅ |
| Editar/eliminar oportunidades de otros | ✅ | ❌ |
| Crear ventas | ✅ | ✅ |
| Editar/cancelar ventas pendientes propias | ✅ | ✅ |
| Confirmar ventas | ✅ | ❌ |
| Editar/cancelar ventas confirmadas | ✅ | ❌ |
| Gestionar usuarios (alta, rol, estado, reseteo) | ✅ | ❌ |

Los permisos se aplican **en el backend** (autoridad final) y se reflejan en la UI para
ocultar acciones no disponibles. Un vendedor no puede archivar ni reactivar empresas o
clientes enviando `status` en un `PATCH`, ni confirmar ventas.

### Reglas de integridad

- Empresas y clientes **se archivan**, no se eliminan, porque tienen relaciones.
- Una oportunidad se elimina físicamente solo si **no** tiene venta asociada.
- Las ventas **nunca se eliminan**: se cancelan (conservando número e histórico).
- Una oportunidad ganada solo puede originar **una** venta (`opportunity_id` único).
- El número de venta se genera de forma atómica con una secuencia de PostgreSQL.
- Solo las ventas `CONFIRMED` cuentan como ingreso en el panel.

## 9. Scripts

| Comando | Descripción |
| --- | --- |
| `pnpm dev` | API y frontend en modo desarrollo. |
| `pnpm dev:backend` / `pnpm dev:frontend` | Solo un servicio. |
| `pnpm build` | Compila backend y frontend. |
| `pnpm start` | Arranca la API compilada. |
| `pnpm typecheck` | TypeScript en ambos paquetes. |
| `pnpm test` | Pruebas de backend (integración) y frontend (unitarias). |
| `pnpm db:migrate` | Crea/aplica migraciones en desarrollo. |
| `pnpm db:deploy` | Aplica migraciones existentes (CI/producción). |
| `pnpm db:seed` | Datos de demostración opcionales. |
| `pnpm create-admin` | Crea el primer administrador. |
| `pnpm db:generate` | Regenera el cliente Prisma. |

## 10. Pruebas

```bash
cp backend/.env.test.example backend/.env.test   # ajusta DATABASE_URL a crm_test
pnpm test
```

- **Backend** (`Vitest` + `Supertest`, base `crm_test` aislada y limpiada entre pruebas):
  autenticación (login, «Recuérdame», CSRF, rate limit, sesiones), RBAC (vendedor vs.
  administrador), validaciones, integridad referencial, numeración de ventas, reglas de
  confirmación/cancelación, dashboard, actividad y bypass de estado en empresas/clientes.
- **Frontend** (`Vitest` + `jsdom`): formato de importes sin pérdida de precisión,
  fechas civiles, permisos por rol, esquemas Zod y cliente HTTP (CSRF, errores, red).

Comandos: `pnpm test:backend`, `pnpm test:frontend`.

## 11. Limitaciones conocidas

- **Google OIDC** implementado pero no verificado en vivo (faltan credenciales OAuth).
- Los archivos de proyecto (incluidas imágenes) se guardan en PostgreSQL
  (`project_files.data`) para sobrevivir a reinicios y a discos efímeros como el de
  Render. La descarga se hace por API autenticada (`/api/projects/:id/files/:fileId/download`).
- Los avatares también se guardan en PostgreSQL (`user_avatars.data`) y se sirven desde
  `/api/avatars/:userId`, por lo que sobreviven a reinicios y despliegues en Render.
- La aplicación no incluye envío de correos (recuperación de contraseña se resuelve con
  reseteo por parte de un administrador).
- El límite de tasa es en memoria: con varias instancias se debe usar un almacén
  compartido (por ejemplo Redis).
- Los filtros y la paginación se resuelven en el servidor; el Kanban solicita hasta 100
  oportunidades y avisa cuando hay más.
