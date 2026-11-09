# Sesiones y cookies: arquitectura de mismo origen

La configuración recomendada es servir frontend y API bajo el mismo origen. El
frontend usa rutas relativas (`/api` y `/uploads`) cuando `VITE_API_URL` está vacío;
el hosting debe reenviar esas rutas al backend. Así la cookie HttpOnly no depende
de cookies de terceros y es la opción más compatible con Chrome/Edge en privado.

## Desarrollo

`frontend/vite.config.ts` proxifica `/api` y `/uploads` al backend local. Mantén
`VITE_API_URL` vacío y abre el CRM con una URL consistente, por ejemplo
`http://localhost:5173`. No mezcles `localhost` y `127.0.0.1`, ya que son hosts
distintos para las cookies.

## Producción

El hosting que sirve `frontend/dist` debe reenviar `/api` y `/uploads` al backend,
conservando el host público del frontend. En ese caso deja `VITE_API_URL` vacío.
Configura en el backend `APP_URL` y `CORS_ORIGINS` con el origen público exacto y
usa HTTPS (`NODE_ENV=production` fuerza `Secure`).

Si la plataforma no permite proxy del mismo origen, se puede definir
`VITE_API_URL` con la URL base de la API y reconstruir/redeployar el frontend. El
backend debe permitir el origen exacto del frontend en `CORS_ORIGINS` y CORS con
credenciales. En producción, el backend emite la cookie `SameSite=None; Secure`
para permitir peticiones cross-site. Aun así, el navegador puede bloquear cookies
de terceros, especialmente en incógnito; por ello la solución fiable es un proxy
de mismo origen.

Después de desplegar frontend y backend, reinicia ambos servicios y elimina las
cookies antiguas del dominio del CRM antes de probar de nuevo.

## Diagnóstico si aún vuelve al login

En DevTools → Network, revisa `POST /api/auth/login` (o la URL del API configurada):
la respuesta debe ser 200 e incluir `Set-Cookie`. Luego `/api/auth/me` debe enviar
esa cookie y responder 200. Un 404 indica que el hosting no reenvía `/api` o que la
URL base de API está mal configurada; errores CORS indican que el backend no permite
el origen público exacto con credenciales; un 401 en `/me` indica que la cookie no
llegó al backend o que no encuentra la sesión en la base de datos. Si `/me` da 200
pero la UI vuelve al login, revisa el estado de autenticación del frontend y que el
despliegue sirva la compilación más reciente.
