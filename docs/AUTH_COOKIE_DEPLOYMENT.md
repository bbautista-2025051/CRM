# Sesiones y cookies: arquitectura de mismo origen

El frontend debe llamar a la API mediante rutas relativas (`/api` y `/uploads`) en
el mismo origen desde el que se sirve la aplicación. Así, la cookie HttpOnly de
sesión se considera first-party y no depende de la política de cookies de terceros
de Chrome/Edge en ventanas privadas.

## Desarrollo

`frontend/vite.config.ts` ya proxifica `/api` y `/uploads` al backend local. Mantén
`VITE_API_URL` sin configurar (el cliente HTTP usa rutas relativas) y abre el CRM
con la misma dirección siempre, por ejemplo `http://localhost:5173`. No mezcles
`localhost` y `127.0.0.1`, ya que son hosts distintos para las cookies.

## Producción

El hosting que sirve `frontend/dist` debe reenviar las rutas `/api` y `/uploads` al
backend, conservando el host público del frontend. No apuntes el frontend a una URL
absoluta de API en otro dominio. El backend debe tener `APP_URL` y `CORS_ORIGINS`
configurados con el origen público exacto y `COOKIE_SECURE=true` bajo HTTPS
(`NODE_ENV=production` lo fuerza también). La cookie de sesión usa `HttpOnly`,
`SameSite=Lax` y `Secure` en producción.

La aplicación usa rutas relativas incluso si queda una variable `VITE_API_URL`
antigua en el entorno de compilación; elimínala para evitar confusión. Una URL de
API en otro dominio requiere una arquitectura explícita de proxy mismo-origen; no
se resolverá habilitando cookies de terceros, porque Chrome/Edge pueden bloquearlas.

Después de desplegar frontend y backend, reinicia ambos servicios y elimina las
cookies antiguas del dominio del CRM antes de probar de nuevo.

## Diagnóstico si aún vuelve al login

En DevTools → Network, después del `POST /api/auth/login` comprueba que la respuesta
incluya `Set-Cookie` para la sesión y que la petición siguiente a `/api/auth/me`
envíe esa cookie y reciba 200. Si `/me` devuelve 401, confirma que la petición llega
al backend correcto y revisa sus logs/configuración de base de datos/sesiones. Si
`/me` devuelve 200 pero la pantalla vuelve a `/login`, el problema está en el estado
inicial de autenticación o en el despliegue de una versión antigua del frontend.
