# Guía de entrega — NutriBox API (Proyecto 1)

Pasos para publicar el proyecto, desplegarlo y presentarlo. El código ya está completo y probado.

## 1. Subir a GitHub

1. Crear en GitHub el repositorio **público** `nutribox-api` **vacío** (sin README, ya viene incluido).
2. En la carpeta del proyecto:

```bash
git remote add origin https://github.com/ujeisson-alt/nutribox-api.git
git push -u origin main
git push -u origin develop
```

> Los commits siguen Conventional Commits y cada etapa se trabajó en su rama `feature/*`, fusionada en `develop`.
> Al terminar el deploy, fusioná `develop` en `main` (`git checkout main && git merge develop && git push`).

Antes de subir, confirmá que `.env` **no** aparece en `git status` (está en `.gitignore`).

## 2. Correrlo en tu PC

```bash
npm install
cp .env.example .env          # completar con tus datos de MySQL, MongoDB y un JWT_SECRET largo
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
npm run seed                  # crea el ADMIN con SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD
npm run dev
```

Checkpoint: `http://localhost:3000` responde `{"message":"API NutriBox corriendo", ...}`.

## 3. MongoDB Atlas (gratis)

1. Crear cluster M0 en mongodb.com/atlas → *Database Access*: crear usuario → *Network Access*: permitir `0.0.0.0/0`.
2. *Connect → Drivers* → copiar la URI y agregarle el nombre de la base: `.../nutribox_logs?retryWrites=true&w=majority`.
3. Pegarla en `MONGODB_URI`.

## 4. Deploy en Railway

1. railway.app → login con GitHub → *New Project → Deploy from GitHub repo* → `nutribox-api`.
2. *New → Database → MySQL*. En el servicio MySQL → *Connect → Public Network* copiar host, puerto y
   contraseña, y desde tu PC ejecutar (el editor web de Railway no soporta `DELIMITER` del stored procedure):

```bash
mysql -h <HOST_PUBLICO> -P <PUERTO> -u root -p < database/schema.sql
mysql -h <HOST_PUBLICO> -P <PUERTO> -u root -p < database/seed.sql
```

3. En el servicio de la app → *Variables*:
   - `DATABASE_URL` = `mysql://${{MySQL.MYSQLUSER}}:${{MySQL.MYSQLPASSWORD}}@${{MySQL.MYSQLHOST}}:${{MySQL.MYSQLPORT}}/nutribox_db`
     (el script crea la base `nutribox_db`; por eso no se usa `MYSQL_URL`, que apunta a la base `railway`)
   - `MONGODB_URI` = URI de Atlas
   - `JWT_SECRET` = 32+ caracteres aleatorios (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`)
   - `NODE_ENV` = `production`
   - `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD` (para crear el admin)
4. *Settings → Networking → Generate Domain*.
5. Crear el admin una vez desde tu PC: poner en `.env` un `DATABASE_URL` con el host/puerto **públicos** de
   Railway (`mysql://root:<pass>@<HOST_PUBLICO>:<PUERTO>/nutribox_db`) y ejecutar `npm run seed`.
6. Verificar `GET https://TU-APP.up.railway.app/health` → 200.
7. Reemplazar la URL en el README (sección *Live Demo*) y en el environment de Postman *NutriBox Production*.

## 5. Postman

Importar los 3 archivos de `docs/postman/`. En el environment completar `adminEmail` y `adminPassword`.
Ejecutar primero **Auth → Register**, **Login (USER)** y **Login (ADMIN)**: los tokens se guardan solos.
La colección completa se puede correr con *Run collection* (35 requests, 34 aserciones).

## 6. Demo para entrevistas (5–10 min)

1. `POST /auth/register` → usuario nuevo (contraseña hasheada con bcrypt, nunca se devuelve).
2. `POST /auth/login` → token JWT (queda registrado `LOGIN` en MongoDB).
3. `POST /orders` con Bearer token → el total lo calcula el servidor con precios de la base.
4. `PATCH /orders/:id/status` a `CONFIRMED` (ADMIN) → el stored procedure descuenta el stock en una transacción.
5. `GET /reports/sales` con token ADMIN → ventas, ticket promedio, top productos y ventas por día.
6. `GET /orders` sin token → **401**; `GET /reports/sales` con token USER → **403**.

### Preguntas probables y cómo responderlas

- **¿Por qué dos bases de datos?** MySQL garantiza integridad (FK, transacciones) para pedidos y stock;
  MongoDB guarda logs y reseñas: alto volumen, estructura flexible y TTL de 90 días para los logs.
- **¿Cómo evitás vender sin stock?** Se valida al crear el pedido y, al confirmar, `sp_confirm_order` descuenta
  en una transacción; si algún producto quedara negativo, el `CHECK` falla y se hace `ROLLBACK` completo (409).
- **¿Por qué baja lógica?** Borrar un usuario borraría sus pedidos en cascada y un producto vendido no se
  puede borrar (`RESTRICT`). Desactivar conserva el historial y los reportes.
- **¿Qué mejorarías?** Swagger, caché con Redis para reportes, refresh tokens, emails con Nodemailer.

## 7. Checklist de calidad final

| Ítem | Estado |
| --- | --- |
| Todos los endpoints CRUD funcionan | ✅ probado con Postman/Newman (34/34) |
| Registro, login, rutas protegidas y roles | ✅ |
| Zod rechaza datos incorrectos con mensajes útiles | ✅ |
| Reporte de ventas con datos correctos | ✅ test de integración |
| Logs en MongoDB al hacer login y crear pedidos | ✅ test de integración |
| Sin `any` explícito en TypeScript | ✅ |
| Sin secretos hardcodeados | ✅ todo en `.env` |
| `.gitignore` con node_modules, dist y .env | ✅ |
| Sin `console.log` de debug (solo `utils/logger.ts`) | ✅ |
| `npm run build` sin errores | ✅ |
| README en inglés con endpoints, instalación y variables | ✅ |
| Colección Postman en `/docs/postman` | ✅ |
| Diagrama DER en el README | ✅ `docs/der.png` |
| URL de producción en el README | ⏳ completar después del deploy |
