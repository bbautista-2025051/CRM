const errorResponse = {
  description: 'Error de la API',
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/Error' },
    },
  },
};

const secured = [{ cookieAuth: [] }];

const idParam = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'string', format: 'uuid' },
};

const paginationParams = [
  { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
  {
    name: 'pageSize',
    in: 'query',
    schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
  },
  { name: 'search', in: 'query', schema: { type: 'string', maxLength: 120 } },
  {
    name: 'sortOrder',
    in: 'query',
    schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
  },
];

const jsonBody = (schema: Record<string, unknown>, required = true) => ({
  required,
  content: { 'application/json': { schema } },
});

const csrfHeader = {
  name: 'X-CSRF-Token',
  in: 'header',
  required: true,
  description:
    'Token CSRF devuelto por /api/auth/me o /api/auth/login. Obligatorio en POST/PATCH/DELETE autenticados.',
  schema: { type: 'string' },
};

const withCsrf = (parameters: unknown[] = []) => [...parameters, csrfHeader];

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Nexo CRM API',
    version: '1.0.0',
    description:
      'API REST del CRM. Autenticación mediante cookie HttpOnly y token CSRF. Los errores usan el formato { error: { code, message, details? } }.',
  },
  servers: [{ url: '/api', description: 'Servidor actual' }],
  tags: [
    { name: 'Auth', description: 'Autenticación y sesión' },
    { name: 'Usuarios', description: 'Administración de cuentas (solo ADMIN)' },
    { name: 'Empresas' },
    { name: 'Clientes' },
    { name: 'Oportunidades' },
    { name: 'Ventas' },
    { name: 'Dashboard' },
    { name: 'Configuración' },
    { name: 'Actividad' },
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'nexo_session',
        description: 'Cookie de sesión HttpOnly establecida por el servidor.',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string' },
              details: { type: 'object' },
            },
          },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', format: 'password' },
          rememberMe: { type: 'boolean', default: false },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['ADMIN', 'VENDEDOR'] },
          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] },
          avatarUrl: { type: 'string', nullable: true },
          themePreference: { type: 'string', enum: ['LIGHT', 'DARK', 'SYSTEM'] },
          googleLinked: { type: 'boolean' },
          mustChangePassword: { type: 'boolean' },
        },
      },
      UserCreate: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 120 },
          email: { type: 'string', format: 'email' },
          password: {
            type: 'string',
            minLength: 10,
            description: 'Mínimo 10 caracteres, mayúscula, minúscula y número',
          },
          role: { type: 'string', enum: ['ADMIN', 'VENDEDOR'], default: 'VENDEDOR' },
          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
          mustChangePassword: { type: 'boolean', default: true },
        },
      },
      CompanyInput: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', maxLength: 160 },
          legalName: { type: 'string', nullable: true },
          taxId: { type: 'string', nullable: true, description: 'Único si se envía' },
          sector: { type: 'string', nullable: true },
          email: { type: 'string', format: 'email', nullable: true },
          phone: { type: 'string', nullable: true },
          address: { type: 'string', nullable: true },
          website: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['ACTIVE', 'ARCHIVED'] },
          notes: { type: 'string', nullable: true },
        },
      },
      ClientInput: {
        type: 'object',
        required: ['firstName', 'lastName', 'email'],
        properties: {
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          email: { type: 'string', format: 'email', description: 'Único' },
          phone: { type: 'string', nullable: true },
          jobTitle: { type: 'string', nullable: true },
          companyId: { type: 'string', format: 'uuid', nullable: true },
          status: { type: 'string', enum: ['ACTIVE', 'ARCHIVED'] },
          notes: { type: 'string', nullable: true },
        },
      },
      OpportunityInput: {
        type: 'object',
        required: ['name', 'value'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          companyId: { type: 'string', format: 'uuid', nullable: true },
          clientId: { type: 'string', format: 'uuid', nullable: true },
          ownerId: { type: 'string', format: 'uuid' },
          value: { type: 'number', exclusiveMinimum: 0 },
          probability: { type: 'integer', minimum: 0, maximum: 100 },
          expectedCloseDate: {
            type: 'string',
            format: 'date',
            nullable: true,
            example: '2026-12-31',
          },
          stage: {
            type: 'string',
            enum: [
              'PROSPECTO',
              'CALIFICACION',
              'PROPUESTA',
              'NEGOCIACION',
              'GANADA',
              'PERDIDA',
            ],
          },
        },
      },
      SaleInput: {
        type: 'object',
        required: ['saleDate', 'amount'],
        properties: {
          companyId: { type: 'string', format: 'uuid', nullable: true },
          clientId: { type: 'string', format: 'uuid', nullable: true },
          opportunityId: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            description: 'Oportunidad GANADA sin venta previa',
          },
          ownerId: { type: 'string', format: 'uuid' },
          saleDate: { type: 'string', format: 'date' },
          amount: { type: 'number', exclusiveMinimum: 0 },
          currency: { type: 'string', minLength: 3, maxLength: 3, example: 'GTQ' },
          status: {
            type: 'string',
            enum: ['PENDING', 'CONFIRMED', 'CANCELLED'],
            default: 'PENDING',
          },
          notes: { type: 'string', nullable: true },
        },
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          pageSize: { type: 'integer' },
          total: { type: 'integer' },
          totalPages: { type: 'integer' },
        },
      },
    },
  },
  security: secured,
  paths: {
    '/health': {
      get: {
        tags: ['Auth'],
        summary: 'Comprobación de estado',
        security: [],
        responses: { '200': { description: 'API operativa' } },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Inicio de sesión con correo y contraseña',
        security: [],
        requestBody: jsonBody({ $ref: '#/components/schemas/LoginRequest' }),
        responses: {
          '200': { description: 'Sesión creada. Establece cookie HttpOnly.' },
          '401': errorResponse,
          '403': errorResponse,
          '429': errorResponse,
        },
      },
    },
    '/auth/google': {
      post: {
        tags: ['Auth'],
        summary: 'Inicio de sesión OIDC con Google (solo cuentas ya vinculadas)',
        security: [],
        requestBody: jsonBody({
          type: 'object',
          required: ['credential'],
          properties: { credential: { type: 'string', description: 'ID token de Google' } },
        }),
        responses: {
          '200': { description: 'Sesión creada' },
          '401': errorResponse,
          '403': errorResponse,
        },
      },
    },
    '/auth/google/status': {
      get: {
        tags: ['Auth'],
        summary: 'Indica si Google OAuth está configurado y su client ID público',
        security: [],
        responses: {
          '200': { description: '{ enabled: boolean, clientId: string | null }' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Usuario autenticado, token CSRF y expiración de sesión',
        responses: { '200': { description: 'Sesión activa' }, '401': errorResponse },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Invalida la sesión actual y borra la cookie',
        parameters: [csrfHeader],
        responses: { '204': { description: 'Sesión cerrada' }, '401': errorResponse },
      },
    },
    '/auth/password': {
      post: {
        tags: ['Auth'],
        summary: 'Cambia la contraseña de la cuenta actual',
        parameters: [csrfHeader],
        requestBody: jsonBody({
          type: 'object',
          required: ['currentPassword', 'newPassword'],
          properties: {
            currentPassword: { type: 'string' },
            newPassword: { type: 'string', minLength: 10 },
          },
        }),
        responses: {
          '200': { description: 'Contraseña actualizada' },
          '400': errorResponse,
          '401': errorResponse,
        },
      },
    },
    '/users': {
      get: {
        tags: ['Usuarios'],
        summary: 'Lista usuarios (ADMIN)',
        parameters: [
          ...paginationParams,
          { name: 'role', in: 'query', schema: { type: 'string', enum: ['ADMIN', 'VENDEDOR'] } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] } },
        ],
        responses: { '200': { description: 'Lista paginada' }, '403': errorResponse },
      },
      post: {
        tags: ['Usuarios'],
        summary: 'Crea una cuenta interna (ADMIN)',
        parameters: [csrfHeader],
        requestBody: jsonBody({ $ref: '#/components/schemas/UserCreate' }),
        responses: {
          '201': { description: 'Usuario creado sin exponer la contraseña' },
          '400': errorResponse,
          '409': errorResponse,
        },
      },
    },
    '/users/{id}': {
      get: {
        tags: ['Usuarios'],
        summary: 'Obtiene un usuario (ADMIN)',
        parameters: [idParam],
        responses: { '200': { description: 'Usuario' }, '404': errorResponse },
      },
      patch: {
        tags: ['Usuarios'],
        summary: 'Actualiza nombre, correo, rol o estado (ADMIN)',
        parameters: withCsrf([idParam]),
        requestBody: jsonBody({
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['ADMIN', 'VENDEDOR'] },
            status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] },
          },
        }),
        responses: {
          '200': { description: 'Usuario actualizado' },
          '403': errorResponse,
          '409': errorResponse,
        },
      },
    },
    '/users/{id}/reset-password': {
      post: {
        tags: ['Usuarios'],
        summary: 'Restablece la contraseña de un usuario e invalida sus sesiones (ADMIN)',
        parameters: withCsrf([idParam]),
        requestBody: jsonBody({
          type: 'object',
          required: ['newPassword'],
          properties: { newPassword: { type: 'string', minLength: 10 } },
        }),
        responses: { '204': { description: 'Contraseña restablecida' }, '403': errorResponse },
      },
    },
    '/companies': {
      get: {
        tags: ['Empresas'],
        summary: 'Lista empresas con búsqueda, filtros, orden y paginación',
        parameters: [
          ...paginationParams,
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['ACTIVE', 'ARCHIVED'] } },
          { name: 'sector', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Lista paginada' } },
      },
      post: {
        tags: ['Empresas'],
        summary: 'Crea una empresa',
        parameters: [csrfHeader],
        requestBody: jsonBody({ $ref: '#/components/schemas/CompanyInput' }),
        responses: { '201': { description: 'Empresa creada' }, '400': errorResponse, '409': errorResponse },
      },
    },
    '/companies/options': {
      get: {
        tags: ['Empresas'],
        summary: 'Opciones ligeras para selectores',
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
        ],
        responses: { '200': { description: 'Empresas activas' } },
      },
    },
    '/companies/sectors': {
      get: {
        tags: ['Empresas'],
        summary: 'Sectores distintos registrados',
        responses: { '200': { description: 'Lista de sectores' } },
      },
    },
    '/companies/{id}': {
      get: {
        tags: ['Empresas'],
        summary: 'Detalle con clientes, oportunidades y ventas relacionadas',
        parameters: [idParam],
        responses: { '200': { description: 'Empresa' }, '404': errorResponse },
      },
      patch: {
        tags: ['Empresas'],
        summary: 'Actualiza una empresa',
        parameters: withCsrf([idParam]),
        requestBody: jsonBody({ $ref: '#/components/schemas/CompanyInput' }, false),
        responses: { '200': { description: 'Empresa actualizada' }, '400': errorResponse },
      },
      delete: {
        tags: ['Empresas'],
        summary: 'Archiva una empresa (ADMIN). No elimina datos relacionados.',
        parameters: withCsrf([idParam]),
        responses: { '200': { description: 'Empresa archivada' }, '403': errorResponse },
      },
    },
    '/clients': {
      get: {
        tags: ['Clientes'],
        summary: 'Lista clientes con búsqueda, filtros, orden y paginación',
        parameters: [
          ...paginationParams,
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['ACTIVE', 'ARCHIVED'] } },
          { name: 'companyId', in: 'query', schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': { description: 'Lista paginada' } },
      },
      post: {
        tags: ['Clientes'],
        summary: 'Crea un cliente (correo único)',
        parameters: [csrfHeader],
        requestBody: jsonBody({ $ref: '#/components/schemas/ClientInput' }),
        responses: { '201': { description: 'Cliente creado' }, '409': errorResponse },
      },
    },
    '/clients/options': {
      get: {
        tags: ['Clientes'],
        summary: 'Opciones ligeras para selectores',
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'companyId', in: 'query', schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': { description: 'Clientes activos' } },
      },
    },
    '/clients/{id}': {
      get: {
        tags: ['Clientes'],
        summary: 'Detalle con empresa, oportunidades y ventas',
        parameters: [idParam],
        responses: { '200': { description: 'Cliente' }, '404': errorResponse },
      },
      patch: {
        tags: ['Clientes'],
        summary: 'Actualiza un cliente',
        parameters: withCsrf([idParam]),
        requestBody: jsonBody({ $ref: '#/components/schemas/ClientInput' }, false),
        responses: { '200': { description: 'Cliente actualizado' } },
      },
      delete: {
        tags: ['Clientes'],
        summary: 'Archiva un cliente (ADMIN)',
        parameters: withCsrf([idParam]),
        responses: { '200': { description: 'Cliente archivado' } },
      },
    },
    '/opportunities': {
      get: {
        tags: ['Oportunidades'],
        summary: 'Lista oportunidades con filtros por etapa, responsable y fecha',
        parameters: [
          ...paginationParams,
          {
            name: 'stage',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['PROSPECTO', 'CALIFICACION', 'PROPUESTA', 'NEGOCIACION', 'GANADA', 'PERDIDA'],
            },
          },
          { name: 'ownerId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'companyId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'expectedCloseFrom', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'expectedCloseTo', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: { '200': { description: 'Lista paginada' } },
      },
      post: {
        tags: ['Oportunidades'],
        summary: 'Crea una oportunidad. Un VENDEDOR solo puede asignársela a sí mismo.',
        parameters: [csrfHeader],
        requestBody: jsonBody({ $ref: '#/components/schemas/OpportunityInput' }),
        responses: { '201': { description: 'Oportunidad creada' }, '403': errorResponse },
      },
    },
    '/opportunities/{id}': {
      get: {
        tags: ['Oportunidades'],
        summary: 'Detalle de la oportunidad y su venta',
        parameters: [idParam],
        responses: { '200': { description: 'Oportunidad' }, '404': errorResponse },
      },
      patch: {
        tags: ['Oportunidades'],
        summary: 'Actualiza o cambia de etapa. Estado y fechas se derivan de la etapa.',
        parameters: withCsrf([idParam]),
        requestBody: jsonBody({ $ref: '#/components/schemas/OpportunityInput' }, false),
        responses: { '200': { description: 'Oportunidad actualizada' }, '403': errorResponse },
      },
      delete: {
        tags: ['Oportunidades'],
        summary: 'Elimina una oportunidad sin venta asociada',
        parameters: withCsrf([idParam]),
        responses: { '204': { description: 'Eliminada' }, '409': errorResponse },
      },
    },
    '/sales': {
      get: {
        tags: ['Ventas'],
        summary: 'Lista ventas con búsqueda, filtros, orden y paginación',
        parameters: [
          ...paginationParams,
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'CANCELLED'] },
          },
          { name: 'ownerId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'dateFrom', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'dateTo', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: { '200': { description: 'Lista paginada' } },
      },
      post: {
        tags: ['Ventas'],
        summary: 'Registra una venta con número generado por secuencia de PostgreSQL',
        parameters: [csrfHeader],
        requestBody: jsonBody({ $ref: '#/components/schemas/SaleInput' }),
        responses: {
          '201': { description: 'Venta creada' },
          '409': { description: 'La oportunidad ya tiene venta' },
        },
      },
    },
    '/sales/summary': {
      get: {
        tags: ['Ventas'],
        summary: 'Totales confirmados por moneda y conteos por estado',
        parameters: [
          { name: 'dateFrom', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'dateTo', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: { '200': { description: 'Resumen de ventas' } },
      },
    },
    '/sales/{id}': {
      get: {
        tags: ['Ventas'],
        summary: 'Detalle de venta',
        parameters: [idParam],
        responses: { '200': { description: 'Venta' }, '404': errorResponse },
      },
      patch: {
        tags: ['Ventas'],
        summary: 'Actualiza una venta permitida. Confirmar requiere ADMIN.',
        parameters: withCsrf([idParam]),
        requestBody: jsonBody({ $ref: '#/components/schemas/SaleInput' }, false),
        responses: { '200': { description: 'Venta actualizada' }, '403': errorResponse },
      },
    },
    '/sales/{id}/cancel': {
      post: {
        tags: ['Ventas'],
        summary: 'Cancela una venta con confirmación previa en el cliente',
        parameters: withCsrf([idParam]),
        responses: { '200': { description: 'Venta cancelada' }, '409': errorResponse },
      },
    },
    '/dashboard/summary': {
      get: {
        tags: ['Dashboard'],
        summary: 'Indicadores, gráficos y actividad reciente calculados desde PostgreSQL',
        responses: { '200': { description: 'Resumen del dashboard' } },
      },
    },
    '/settings/profile': {
      get: {
        tags: ['Configuración'],
        summary: 'Perfil, estado de Google y datos de la sesión',
        responses: { '200': { description: 'Perfil' } },
      },
      patch: {
        tags: ['Configuración'],
        summary: 'Actualiza el nombre visible',
        parameters: [csrfHeader],
        requestBody: jsonBody({
          type: 'object',
          required: ['name'],
          properties: { name: { type: 'string' } },
        }),
        responses: { '200': { description: 'Perfil actualizado' } },
      },
    },
    '/settings/preferences': {
      patch: {
        tags: ['Configuración'],
        summary: 'Guarda la preferencia de tema del usuario',
        parameters: [csrfHeader],
        requestBody: jsonBody({
          type: 'object',
          required: ['themePreference'],
          properties: {
            themePreference: { type: 'string', enum: ['LIGHT', 'DARK', 'SYSTEM'] },
          },
        }),
        responses: { '200': { description: 'Preferencia guardada' } },
      },
    },
    '/settings/avatar': {
      post: {
        tags: ['Configuración'],
        summary: 'Sube un avatar (JPG/PNG/WebP, tamaño máximo configurado)',
        parameters: [csrfHeader],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: { avatar: { type: 'string', format: 'binary' } },
              },
            },
          },
        },
        responses: { '200': { description: 'Avatar actualizado' }, '400': errorResponse },
      },
      delete: {
        tags: ['Configuración'],
        summary: 'Elimina el avatar',
        parameters: [csrfHeader],
        responses: { '200': { description: 'Avatar eliminado' } },
      },
    },
    '/settings/google/link': {
      post: {
        tags: ['Configuración'],
        summary: 'Vincula la identidad de Google (correo debe coincidir)',
        parameters: [csrfHeader],
        requestBody: jsonBody({
          type: 'object',
          required: ['credential'],
          properties: { credential: { type: 'string' } },
        }),
        responses: { '200': { description: 'Google vinculado' }, '400': errorResponse },
      },
    },
    '/settings/google/unlink': {
      post: {
        tags: ['Configuración'],
        summary: 'Desvincula Google (requiere contraseña local)',
        parameters: [csrfHeader],
        responses: { '200': { description: 'Google desvinculado' } },
      },
    },
    '/settings/sessions': {
      get: {
        tags: ['Configuración'],
        summary: 'Sesiones activas del usuario',
        responses: { '200': { description: 'Sesiones' } },
      },
    },
    '/settings/sessions/revoke-others': {
      post: {
        tags: ['Configuración'],
        summary: 'Cierra todas las sesiones excepto la actual',
        parameters: [csrfHeader],
        responses: { '200': { description: 'Sesiones revocadas' } },
      },
    },
    '/activity': {
      get: {
        tags: ['Actividad'],
        summary: 'Actividad reciente o historial de una entidad',
        parameters: [
          { name: 'entityType', in: 'query', schema: { type: 'string' } },
          { name: 'entityId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 50 } },
        ],
        responses: { '200': { description: 'Registros de auditoría' } },
      },
    },
  },
};
