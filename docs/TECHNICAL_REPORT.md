# Nexo CRM — Informe técnico

| | |
| --- | --- |
| **Producto** | Nexo CRM |
| **Tipo** | Aplicación web full stack (monorepo pnpm) |
| **Frontend** | React 19.3.1 · TypeScript 5.9.3 · Vite 7.3.7 · Tailwind CSS 3.4.19 |
| **Backend** | Node.js · TypeScript · Express 4.22.3 · Prisma 6.19.3 |
| **Base de datos** | PostgreSQL (desarrollado y probado con PostgreSQL 18) |
| **Autenticación** | Sesiones opacas en servidor + Argon2id + CSRF por sesión |
| **Autorización** | RBAC: `ADMIN`, `VENDEDOR` (backend autoritativo, UI coherente) |
| **Pruebas** | 19 pruebas de integración (backend) + 52 pruebas unitarias (frontend) |

---

## 1. Resumen ejecutivo

Nexo CRM es una aplicación para gestionar el ciclo comercial de una empresa: empresas,
contactos, oportunidades en pipeline y ventas con confirmación. El sistema se diseñó con
tres prioridades:

1. **Seguridad real, no decorativa**: contraseñas con Argon2id, sesiones opacas con
   hash HMAC en base de datos, cookies `HttpOnly`/`SameSite`, CSRF obligatorio en
   mutaciones, validación de origen, rate limiting y autorización en el servidor.
2. **Integridad del dato comercial**: llaves y restricciones en la base de datos,
   archivado en lugar de borrado cuando existen relaciones, numeración de ventas
   atómica y reglas explícitas de transición de estados.
3. **Trazabilidad**: bitácora de actividad de todas las acciones relevantes y sesiones
   auditables/revocables.

La aplicación está completa y funcional de punta a punta en el entorno local. La única
integración implementada que **no** se pudo verificar en vivo es el acceso con Google
(faltan credenciales OAuth); se detalla en la sección 9.

## 2. Arquitectura

```
┌──────────────────────────┐        HTTPS/JSON         ┌────────────────────────────┐
│  SPA React (Vite)        │  ───────────────────────►  │  API REST Express          │
│  · React Router          │   cookie HttpOnly + CSRF   │  · Zod (entrada)           │
│  · TanStack Query        │  ◄───────────────────────  │  · RBAC + sesión           │
│  · RHF + Zod             │        { data, meta }      │  · Servicios por módulo    │
│  · Tailwind, Recharts    │                            │  · Auditoría               │
└──────────────────────────┘                            └─────────────┬──────────────┘
                                                                      │ Prisma Client
                                                                      ▼
                                                        ┌────────────────────────────┐
                                                        │ PostgreSQL                 │
                                                        │ · 6 tablas + 7 enums       │
                                                        │ · secuencia sale_number_seq│
                                                        └────────────────────────────┘
```

### 2.1 Decisiones de arquitectura

| Decisión | Motivo | Consecuencia |
| --- | --- | --- |
| Monorepo pnpm con `@nexo/backend` y `@nexo/frontend` | Un solo `pnpm install`, scripts unificados y tipos coherentes. | Despliegue conjunto o separado sin duplicar configuración. |
| API REST versionable con sobre `{ data, meta }` | Frontend simple y respuestas consistentes. | El cliente HTTP desenvuelve en un único punto. |
| Sesión en servidor (no JWT) | Permite revocar sesiones al instante y cerrar todas las demás. | Requiere consulta a base de datos por petición (índice por `token_hash`). |
| Token de sesión opaco + HMAC | Si se filtra la base de datos no se pueden reutilizar cookies. | Un campo `token_hash` único de 64 caracteres. |
| CSRF por sesión en memoria del cliente | Evita ataques CSRF sin necesidad de doble cookie. | El token se pierde al recargar; se recupera con `GET /api/auth/me`. |
| Zod compartido conceptualmente (esquemas duplicados por capa) | El frontend valida antes de enviar; el backend nunca confía en el cliente. | Duplicación deliberada de reglas, con mensajes equivalentes. |
| Recharts y páginas con `lazy()` | El paquete inicial baja de ~1,08 MB a ~396 kB. | Chunks por ruta y por librería. |
| Decimales como `string` en la API | Evita pérdida de precisión en importes monetarios. | El frontend formatea manualmente sin `Number`. |

### 2.2 Organización del backend

Cada módulo sigue el mismo patrón: `*.routes.ts` (rutas + middlewares), `*.schemas.ts`
(Zod), `*.controller.ts` (HTTP), `*.service.ts` (reglas de negocio y Prisma). Los
middlewares transversales viven en `src/middlewares` y las utilidades en `src/utils`.

```
src/
├─ config/        env (validado con Zod), prisma, logger (pino)
├─ middlewares/   auth, rbac, csrf, validate, rateLimit, origin, upload, errorHandler
├─ modules/       auth, users, companies, clients, opportunities, sales,
│                 dashboard, settings, activity
├─ utils/         password (argon2id), session, activity, pagination, zod, serializers, errors
├─ docs/          openapi.ts (OpenAPI 3 + Swagger UI)
├─ tests/         helpers, auth.test.ts, commercial.test.ts
├─ app.ts         composición de Express
└─ server.ts      arranque y apagado ordenado
```

### 2.3 Organización del frontend

```
src/
├─ components/
│  ├─ layout/     AppShell, Sidebar, Topbar, RouteGuards
│  ├─ ui/         Button, Input, Modal, Dropdown, Tabs, Badge, Skeleton…
│  ├─ companies/  CompanyFormModal, CompanyDetailModal
│  ├─ clients/    ClientFormModal
│  ├─ opportunities/ FormModal, DetailModal
│  └─ sales/      FormModal, DetailModal
├─ hooks/         queries.ts (catálogos y opciones cacheadas)
├─ lib/           api.ts, endpoints.ts, validation.ts, permissions.ts, format.ts
├─ pages/         Dashboard, Companies, CompanyDetail, Clients, ClientDetail,
│                 Opportunities, Sales, Users, Settings, Activity, Login, NotFound
├─ providers/     AuthProvider, ThemeProvider, ToastProvider, ConfirmProvider
└─ types/         Contratos de la API
```

## 3. Modelo de datos

Detalle completo con diagrama Mermaid, columnas, índices y reglas en
[`docs/ERD.md`](./ERD.md). Resumen:

| Tabla | Rol | Relaciones principales |
| --- | --- | --- |
| `users` | Cuentas internas, rol y preferencias | 1‑N `sessions`, `activity_logs`; 1‑N oportunidades y ventas como responsable |
| `sessions` | Sesiones activas con expiración y CSRF | N‑1 `users` (CASCADE) |
| `activity_logs` | Auditoría inmutable de acciones | N‑1 `users` (SET NULL) |
| `companies` | Cuentas comerciales | 1‑N clientes, oportunidades y ventas; N‑1 creador |
| `clients` | Contactos | N‑1 empresa (SET NULL); 1‑N oportunidades y ventas |
| `opportunities` | Pipeline | N‑1 empresa/cliente/responsable; 0‑1 venta |
| `sales` | Operaciones económicas | N‑1 empresa/cliente/responsable; 0‑1 oportunidad (única) |

Puntos clave de integridad:

- `users.email`, `users.google_id`, `companies.tax_id`, `clients.email`,
  `sales.sale_number` y `sales.opportunity_id` son **UNIQUE**.
- `opportunities.owner_id` y `sales.owner_id` usan `ON DELETE RESTRICT`: un usuario con
  registros asignados no se puede borrar (se desactiva).
- Los borrados en cascada solo existen en `sessions` (dependientes de la cuenta).
- `sale_number_seq` es una secuencia PostgreSQL creada por migración; cada venta toma su
  número de forma atómica (`V-AAAA-00001`).
- Importes en `DECIMAL(14,2)`; el API los serializa como string.

## 4. Seguridad

| Control | Implementación | Evidencia |
| --- | --- | --- |
| Hash de contraseñas | Argon2id (`@node-rs/argon2`) con parámetros por defecto de la librería | `src/utils/password.ts` |
| Sesión | Token de 32 bytes `base64url`; en BD solo `HMAC-SHA256(SESSION_SECRET, token)` | `src/utils/session.ts` |
| Cookie | `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` si `COOKIE_SECURE=true`, expiración alineada con la sesión | `src/utils/session.ts` |
| «Recuérdame» | 8 h por defecto frente a 30 días; la duración se guarda por sesión | `SESSION_TTL_HOURS`, `SESSION_REMEMBER_DAYS` |
| CSRF | Token por sesión exigido en `X-CSRF-Token` en todas las mutaciones autenticadas | `src/middlewares/csrf.ts` |
| Origen | Validación de `Origin`/`Referer` contra `APP_URL` y `CORS_ORIGINS`; CORS con credenciales | `src/middlewares/origin.ts`, `app.ts` |
| Rate limiting | Global 600/15 min; login 10/15 min (solo fallos); acciones sensibles 20/h | `src/middlewares/rateLimit.ts` |
| Validación de entrada | Zod en `query`, `params` y `body`; errores `422` con `details.fields` | `src/middlewares/validate.ts` |
| Errores | Manejador central: no filtra trazas ni detalles de Prisma al cliente | `src/middlewares/errorHandler.ts` |
| Cabeceras | Helmet (sin CSP en la API porque solo sirve JSON) | `src/app.ts` |
| Uploads | Solo imágenes, límite de tamaño, validación de firma binaria, nombres aleatorios | `src/middlewares/upload.ts` |
| Autorización | Middlewares `requireAuth`/`requireAdmin` + reglas de propiedad en servicios | `src/middlewares/auth.ts`, servicios |
| Sesiones | Listado y revocación (`revoke-others`) con invalidación inmediata | `modules/settings` |
| Auditoría | Eventos de login, logout, CRUD, confirmación, cancelación y usuarios | `src/utils/activity.ts` |

Notas:

- El listado de usuarios exige `ADMIN`; un vendedor recibe `403`.
- El cambio de rol propio y la desactivación propia se bloquean también en el servidor.
- Los mensajes de error de login no distinguen «usuario inexistente» de «contraseña
  incorrecta».

## 5. Reglas de negocio

### Oportunidades

- Etapas: `PROSPECTO → CALIFICACION → PROPUESTA → NEGOCIACION → GANADA | PERDIDA`.
- `GANADA` fija `status = WON` y `wonAt`; `PERDIDA` fija `LOST` y `lostAt`; volver a una
  etapa abierta limpia ambos.
- Se pueden editar/eliminar solo por su responsable o un administrador.
- No se elimina una oportunidad con venta asociada.

### Ventas

- Estados: `PENDING → CONFIRMED → CANCELLED` (cancelación desde `PENDING` o `CONFIRMED`).
- El número se genera en el servidor; el cliente no lo elige.
- Confirmar es exclusivo de `ADMIN`.
- Un vendedor solo edita/cancela sus ventas `PENDING`; las `CONFIRMED` y `CANCELLED` son
  inmutables para él.
- El endpoint de actualización rechaza `status: CANCELLED`: la cancelación tiene su
  propia ruta (`POST /api/sales/:id/cancel`) para forzar la regla.
- Una venta con `opportunity_id` no puede cambiar de oportunidad y la oportunidad solo
  puede generar una venta.

### Empresas y clientes

- Se archivan (`ARCHIVED`) y se reactivan; nunca se borran por API.
- Solo `ADMIN` puede archivar/reactivar (incluido el `status` enviado en creación o
  `PATCH`). Regresión cubierta por prueba automatizada.

### Panel

- «Ingresos confirmados» suma únicamente ventas `CONFIRMED`, agrupadas por moneda.
- El gráfico devuelve siempre 6 meses (con ceros), de modo que el estado vacío es real.
- La conversión usa oportunidades ganadas/perdidas.

## 6. API

- Base: `/api`. Formato de éxito `{ "data": ..., "meta"?: ... }`; errores
  `{ "error": { "code", "message", "details"? } }`.
- Códigos usados: `400`, `401`, `403`, `404`, `409`, `422`, `429`, `500`.
- Documentación interactiva: `GET /api/docs` (Swagger UI) y `GET /api/openapi.json`.
- `GET /api/health` para sondas de disponibilidad (sin autenticación).

Endpoints principales:

| Recurso | Endpoints |
| --- | --- |
| Auth | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/password`, `POST /auth/google`, `GET /auth/google/status` |
| Usuarios | `GET/POST /users`, `GET/PATCH /users/:id`, `POST /users/:id/reset-password` |
| Empresas | `GET/POST /companies`, `GET /companies/options`, `GET /companies/sectors`, `GET/PATCH/DELETE /companies/:id` |
| Clientes | `GET/POST /clients`, `GET /clients/options`, `GET/PATCH/DELETE /clients/:id` |
| Oportunidades | `GET/POST /opportunities`, `GET/PATCH/DELETE /opportunities/:id` |
| Ventas | `GET/POST /sales`, `GET /sales/summary`, `GET/PATCH /sales/:id`, `POST /sales/:id/cancel` |
| Panel | `GET /dashboard/summary` |
| Configuración | `GET/PATCH /settings/profile`, `PATCH /settings/preferences`, `POST/DELETE /settings/avatar`, `POST /settings/google/link`, `POST /settings/google/unlink`, `GET /settings/sessions`, `POST /settings/sessions/revoke-others` |
| Actividad | `GET /activity` |

Convenciones de listado: `page`, `pageSize` (máx. 100), `search`, filtros por estado y
ordenamiento (`sortBy`, `sortOrder`) validados con Zod.

## 7. Frontend

- **Enrutado** con React Router 7 y rutas protegidas: `ProtectedRoute` exige sesión;
  `AdminRoute` exige `ADMIN` y redirige al panel si no lo es; `PublicOnlyRoute` evita
  volver al login con sesión activa.
- **Estado servidor** con TanStack Query (claves por recurso, invalidación tras
  mutaciones, `staleTime` en catálogos).
- **Formularios** con React Hook Form + Zod, errores por campo del backend mapeados a
  `setError` cuando aplica y mensajes generales en `Alert`.
- **Tema** en `ThemeProvider`: preferencia `LIGHT | DARK | SYSTEM` persistida en la
  cuenta y en `localStorage`, con aplicación antes del primer render.
- **Permisos** centralizados en `lib/permissions.ts` (mismas reglas que el backend) para
  ocultar acciones.
- **Accesibilidad**: navegación por teclado en menús y modales, `aria-label` en botones
  icónicos, foco atrapado en diálogos, `role="status"` en cargas.
- **Rendimiento**: `lazy()` por ruta; paquete inicial ~396 kB (124 kB gzip).

## 8. Pruebas y verificación

### 8.1 Automatizadas

```text
Backend  (Vitest + Supertest, PostgreSQL crm_test)
  ✓ 19 pruebas — auth, sesiones, CSRF, origen permitido, rate limit, RBAC, CRUD,
    integridad, numeración de ventas, confirmación/cancelación, dashboard, actividad

Frontend (Vitest + jsdom)
  ✓ 52 pruebas — format (importes, fechas civiles), permissions, validation, api
```

Ejecución: `pnpm test` (requiere `backend/.env.test` apuntando a `crm_test`).

### 8.2 Verificación manual en navegador (realizada)

Con la API en `:4000` y Vite en `:5173`, sobre PostgreSQL local:

1. Login con el administrador creado por script y aviso de cambio de contraseña.
2. Alta de empresa **Acme Servicios S.A.S.**: aparece en el listado con contadores en 0.
3. Alta de cliente **María Gómez** vinculada a la empresa (selector filtrado por empresa).
4. Alta de oportunidad **Renovación anual 2026** (US$45.000, etapa Ganada, cierre 15 dic 2026).
5. Registro de venta desde la oportunidad: cliente, empresa y responsable se heredan y
   se bloquean; número `V-2026-00001` generado por el servidor.
6. Confirmación de la venta como administrador: pasa a `CONFIRMED` y los ingresos del
   panel y de ventas reflejan US$45.000.
7. Panel: KPIs, gráfico de 6 meses, embudo, oportunidades y actividad recientes correctos.
8. Alta de usuario vendedor **Laura Restrepo** con contraseña temporal.
9. Configuración: perfil, sesiones activas (expiración a 8 h), pestaña Google en estado
   «no configurado», cambio de tema claro/oscuro con persistencia.
10. Actividad: 8 eventos registrados, incluidos login y creación de usuario.
11. Login como vendedor con «Recuérdame»: no aparece el módulo Usuarios; `GET /users` por
    ruta directa redirige al panel; la venta confirmada solo ofrece «Ver detalle»; la
    empresa no ofrece archivar.

Defectos encontrados y corregidos durante esta verificación:

| # | Defecto | Corrección |
| --- | --- | --- |
| 1 | `formatDate` restaba un día a las fechas sin hora en zonas UTC negativas (`2026-12-15T00:00:00.000Z` → «14 dic»). | Las fechas civiles se detectan y se interpretan sin desplazamiento; prueba unitaria añadida. |
| 2 | «Hoy» se calculaba con `toISOString()` (UTC), lo que adelantaba el día por la tarde/noche. | `todayISO()` usa componentes locales. |
| 3 | Al crear una venta desde una oportunidad, el `<select>` de cliente quedaba vacío porque las opciones llegaban después de fijar el valor. | Efecto de resincronización cuando la opción ya existe. |
| 4 | El paquete inicial superaba 1 MB con aviso de Vite. | Carga diferida por ruta; paquete inicial ~396 kB. |
| 5 | Un `Origin` no permitido provocaba un `500` genérico (CORS lanzaba excepción) y en desarrollo `127.0.0.1` se bloqueaba frente a `localhost`. | CORS ya no lanza: el middleware de origen responde `403 ORIGIN_NOT_ALLOWED`; en desarrollo se aceptan los alias `localhost` ⇄ `127.0.0.1`. |

## 9. Integraciones no verificadas

### Google OIDC

- **Implementado:** verificación del ID token con `google-auth-library`
  (`verifyIdToken`), login con `POST /api/auth/google`, vinculación con
  `POST /api/settings/google/link` y desvinculación.
- **Reglas:** no hay auto-registro; solo entra quien ya existe y tiene `google_id`
  vinculado; la vinculación exige correo verificado e idéntico al del CRM.
- **No verificado en vivo:** el entorno no dispone de `GOOGLE_CLIENT_ID` /
  `GOOGLE_CLIENT_SECRET`, por lo que no se pudo completar un flujo real con Google. El
  botón y la pestaña muestran el estado «no configurado» y el acceso por contraseña sigue
  operativo.
- **Pendiente para validar en un entorno con credenciales:** crear el cliente OAuth,
  probar login con cuenta vinculada, intento con cuenta no vinculada (debe rechazar),
  vinculación con correo distinto (debe rechazar) y desvinculación.

### Avatares

- Se guardan en PostgreSQL (`user_avatars`) y se sirven por `/api/avatars/:userId`, sin
  depender del disco efímero del hosting.

## 10. Despliegue

1. `pnpm install --frozen-lockfile`
2. `pnpm build`
3. Variables de producción: `NODE_ENV=production`, `DATABASE_URL`, `SESSION_SECRET`
   nuevo, `COOKIE_SECURE=true`, `APP_URL`/`CORS_ORIGINS` con el dominio, `TRUST_PROXY=true`
   si hay proxy.
4. `pnpm db:deploy` y `pnpm create-admin` (una sola vez).
5. `pnpm start` detrás de un proxy con TLS; servir `frontend/dist` como estáticos y
   enrutar `/api` y `/uploads` al backend.
6. Respaldos de PostgreSQL y rotación de `SESSION_SECRET` (invalida todas las sesiones).

## 11. Limitaciones y trabajo futuro

- Verificación en vivo de Google OAuth (bloqueada por credenciales).
- Almacenamiento de avatares en objeto (S3/GCS) para despliegues multi-instancia.
- Almacén compartido para rate limiting (Redis) si se escala horizontalmente.
- Correo transaccional (invitaciones, recuperación de contraseña, notificaciones).
- Exportación de listados a CSV/XLSX y reportes por período.
- Pruebas E2E automatizadas (Playwright) que reproduzcan la verificación manual.
- Auditoría de cambios campo por campo (hoy se registra la acción y metadatos clave).
