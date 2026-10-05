# ADR 0002 — Google como proveedor de identidad, sesión en JWT y roles por proyecto

**Estado:** aceptado
**Fecha:** 2026-09-16 (actualizado 2026-09-22)
**Decide:** Enzo Cornejo

---

## Contexto

Hay que saber quién hace cada request (autenticación) y qué puede hacer (autorización). En este
dominio los roles (OWNER/EDITOR/READER) no son un atributo global del usuario: dependen del proyecto —
la misma persona puede ser OWNER en un proyecto y READER en otro, vía `MiembroProyecto` (ver
`docs/spec.md` secciones 2 y 3).

## Decisión 1 — Proveedor de identidad: Google OAuth (Auth.js)

No construimos un login propio: le delegamos la prueba de identidad a Google, con Auth.js. Nunca
guardamos ni vemos una contraseña, así que no la podemos filtrar. Es lo que sugiere el template.

- **Se resigna:** si Google se cae, nadie entra al sistema (las sesiones ya iniciadas siguen andando
  hasta que expiren).
- **Alternativas no elegidas:** login propio con contraseña (obliga a hashear, resolver mails repetidos
  y recuperación de cuenta) y servicios como Clerk o Supabase Auth (verifican token en el cliente si no
  se tiene cuidado).

## Decisión 2 — Sesión en JWT (sin PrismaAdapter), sin tablas nuevas

| Opción | A favor | En contra |
|---|---|---|
| PrismaAdapter (sesión en DB) | Sesiones revocables desde el servidor | Suma 3 tablas (Account, Session, VerificationToken) que no usamos para nada más |
| JWT (sin adapter) | Sin tablas extra; el upsert del `Usuario` propio en el callback `jwt` alcanza | Revocar una sesión activa no es inmediato: expira sola |

Elegimos **JWT sin adapter**. En el primer login se hace upsert del `Usuario` por email (el `update`
solo refresca el nombre: lo que dice Google nunca pisa datos propios) y su id queda en el token. La
sesión no lleva rol.

## Decisión 3 — Los roles se leen de la base en cada request, no viajan en el token

Con JWT, un rol guardado en el token es una foto: si el owner cambia a alguien de EDITOR a READER, esa
persona seguiría editando hasta cerrar sesión. Como los roles son por proyecto y cambian (H2), **no van
en el token**: cada handler consulta `MiembroProyecto` (`requerirAccesoAProyecto`, en
`lib/api/autorizar.ts`). El cambio de rol es instantáneo, al costo de una consulta por request.

## Cómo se crea cada rol

El usuario que entra por primera vez no tiene ningún rol: no pertenece a ningún proyecto. Solo
adquiere un rol de una de dos formas: creando un proyecto (queda como OWNER de **ese** proyecto) o
siendo agregado por el OWNER de un proyecto (H2). No existe ningún endpoint para auto-asignarse un rol
en un proyecto ajeno.

## Consecuencias

- Todo endpoint que actúa sobre un proyecto llama a `requerirAccesoAProyecto(proyectoId, roles?)`:
  401 si no hay sesión (`NoAutenticado`), 404 si no es miembro (no se revela si el proyecto existe),
  403 si su rol no alcanza (`NoAutorizado`). `responderError` traduce los dos errores con nombre.
- Las consultas de `lib/db/` que devuelven o modifican datos de un proyecto llevan el id del usuario
  de la sesión en el `where`: aunque un handler olvidara el chequeo, no podría tocar el proyecto ajeno.
- Si más adelante hace falta revocar sesiones activas (por ejemplo, sacar a alguien de golpe de la
  aplicación), JWT no lo resuelve solo; habría que migrar a sesión en base en ese momento. Sacar a
  alguien de un proyecto sí es inmediato (Decisión 3).
