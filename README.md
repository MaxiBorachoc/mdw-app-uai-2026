# Proyecto MDW 2026 — Documentación versionada de proyectos

**Equipo:**

- Maxi Borachoc — responsable del repositorio compartido (creó el repo y tiene la cuenta de Vercel del equipo)
- Enzo Cornejo
- Gabriel Colombano
- Benjamin Bodrero

**Producción:** [https://mdw-app-uai-bcc.vercel.app/](https://mdw-app-uai-bcc.vercel.app/)
**Problema que resuelve:** Evita la pérdida o sobrescritura del contexto de la documentación de un
proyecto de software, permitiendo conservar y consultar versiones anteriores de historias de
usuario, actividades y diagramas.
**Flujo principal:** El usuario crea un proyecto, registra y modifica su documentación generando
versiones automáticamente, cierra versiones del proyecto identificadas con `Version.Build.Patch`
que capturan el estado completo, y puede consultar posteriormente cómo se encontraba documentado
en cada una.

---

## Puesta en marcha

Requisitos: Node 20+, npm, y una base de datos **Postgres** (Supabase).

```bash
npm install
cp .env.example .env.local     # completar DATABASE_URL, DIRECT_URL y AUTH_SECRET
npx prisma migrate dev --name init
npm run db:seed
npm run dev                       # http://localhost:3000
```

Generar el `AUTH_SECRET`:

```bash
npx auth secret
```

> Usen **npm** en todo el equipo y commiteen el `package-lock.json`. Si alguien instala con otro
> gestor aparece un segundo lockfile y las instalaciones dejan de ser reproducibles.

## Variables de entorno

Todo lo que depende de una cuenta externa sale de variables de entorno, nunca del código. Para pasar el
proyecto a otra cuenta (otra base de Supabase, otro proyecto de Vercel) alcanza con cargar las variables
nuevas: en local van en `.env.local` (no se commitea, hay un modelo en `.env.example`) y en Vercel en
*Project → Settings → Environment Variables*.

| Variable | Para qué | De dónde sale |
|---|---|---|
| `DATABASE_URL` | Conexión que usa la app (pooler, puerto 6543) | Supabase → *Connect* |
| `DIRECT_URL` | Conexión directa que usan las migraciones (puerto 5432) | Supabase → *Connect* |
| `AUTH_SECRET` | Firma de la sesión | `npx auth secret` (uno distinto por entorno) |
| `AUTH_GOOGLE_ID` y `AUTH_GOOGLE_SECRET` | Login con Google | Google Cloud Console → Credenciales → ID de cliente OAuth |
| `RESEND_API_KEY` | Envío de correos | resend.com → API Keys |
| `APP_URL` | URL pública de la app, sin barra final; arma los links de los correos | `http://localhost:3000` en local; la URL de Vercel en producción |
| `MAIL_REMITENTE` | Remitente de los correos (opcional) | Si falta se usa el remitente de prueba de Resend. Con un dominio verificado: `Nombre <avisos@tudominio.com>` |

Además de las variables, hay que registrar en Google Cloud Console la URI de redirección
`<URL de la app>/api/auth/callback/google` (una por entorno: local y producción).

En una base nueva hay que aplicar las migraciones una vez: `npx prisma migrate deploy` (con `DIRECT_URL`
apuntando a esa base).

## Comandos

| Comando | Para qué |
|---|---|
| `npm run dev` | Levantar en desarrollo |
| `npm run build` | Build de producción (lo mismo que corre Vercel) |
| `npm run lint` | Lint |
| `npm run typecheck` | Chequeo de tipos sin emitir |
| `npm test` | Tests |
| `npx prisma migrate dev` | Crear y aplicar una migración |
| `npx prisma studio` | Ver y editar los datos a mano |
| `npm run db:seed` | Cargar datos de ejemplo |

## Estructura

```
app/                    rutas (App Router)
  (public)/             páginas sin sesión
  (app)/                páginas con sesión
  api/                  Route Handlers
components/             componentes de UI
lib/
  db/                   acceso a datos — ÚNICO lugar que habla con Prisma
  schemas/              schemas de Zod (validación + tipos)
  auth.ts               configuración de sesión y roles
prisma/
  schema.prisma         modelo de datos
  seed.ts               datos de ejemplo
docs/
  spec.md               qué hace el sistema (requerimientos)
  adr/                  decisiones técnicas y por qué
```

## Reglas del equipo

- Las convenciones de código están en [`AGENTS.md`](./AGENTS.md).
- Una decisión técnica que cueste revertir se documenta como ADR en `docs/adr/`.

## Definition of Done

Una tarea está terminada cuando:

- [ ] Funciona en el preview deployment, no solo en la máquina de quien la escribió.
- [ ] La validación está en el servidor, no solo en el cliente.
- [ ] Los estados de carga y error están resueltos en la UI.
- [ ] `npm run build` y `npm run typecheck` pasan.
- [ ] Alguien más del equipo la revisó y puede explicarla.
