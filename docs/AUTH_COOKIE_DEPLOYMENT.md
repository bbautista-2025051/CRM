# Sesiones y cookies: arquitectura de mismo origen

La opción recomendada es servir el frontend y la API bajo el mismo origen. El
frontend usa rutas relativas (`/api` y `/uploads`) cuando `VITE_API_URL` está vacío;
el hosting debe reenviar esas rutas al backend. Así la cookie HttpOnly no depende
de cookies de terceros y funciona con las políticas de Chrome/Edge en ventanas
privadas.

## Desarrollo

`frontend/vite.config.ts` proxifica `/api` y `/uploads` al backend local. Mantén
`VITE_API_URL` vacío y abre el CRM con una URL consistente, por ejemplo
`http://localhost:5173`. No mezcles `localhost` y `127.0.0.1`, ya que son hosts
distintos para las cookies.

## Producción

El hosting que sirve `frontend/dist` debe reenviar `/api` y `/uploads` al backend,
conservando el host público del frontend. En ese caso deja `VITE_API_URL` vacío.
Configura en el backend `APP_URL` y `CORS_ORIGINS` con el origen público exacto y
usa HTTPS (`NODE_ENV=production` fuerza `Secure`). La cookie de sesión tiene
`HttpOnly`, `SameSite=Lax` y `Secure` en producción.

Si la plataforma no permite proxy del mismo origen, se puede definir
`VITE_API_URL` con la URL base de la API y reconstruir/redeployar el frontend. El
backend debe permitir el origen exacto del frontend en `CORS_ORIGINS` y CORS con
credenciales. La cookie `SameSite=Lax` solo funciona si frontend y API son del
mismo sitio (por ejemplo, subdominios del mismo dominio registrable). Si están en
dominios distintos, el navegador puede bloquear la cookie como third-party; la
solución fiable es configurar un proxy de mismo origen, no depender de cookies de
terceros en modo incógnito.

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
