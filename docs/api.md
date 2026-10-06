# Contrato de la API

Todos los endpoints requieren sesión (cookie de Auth.js). Los roles (`OWNER`, `EDITOR`, `READER`) son
por proyecto, ver `docs/spec.md` secciones 2 y 3. Los errores tienen el formato `{ "error": "<mensaje>" }`;
los de validación (400) agregan `"detalles"` con el detalle de Zod y los conflictos (409) agregan un
`"codigo"` y el dato que explica el conflicto.

## Resumen

| Método | Ruta | Qué hace | Rol requerido |
|---|---|---|---|
| GET | `/api/proyectos` | Lista los proyectos del usuario | Cualquier usuario con sesión |
| POST | `/api/proyectos` | Crea un proyecto y deja al usuario como `OWNER` (H1) | Cualquier usuario con sesión |
| GET | `/api/proyectos/:id` | Devuelve un proyecto con su owner y miembros | Miembro del proyecto (cualquier rol) |
| PUT | `/api/proyectos/:id` | Edita nombre y descripción (H1) | `OWNER` |
| DELETE | `/api/proyectos/:id` | Elimina el proyecto y todo su contenido en cascada (H1) | `OWNER` |
| POST | `/api/proyectos/:id/cerrar-version` | Cierra la versión en desarrollo y abre la siguiente (H8) | `OWNER` o `EDITOR` |
| GET | `/api/proyectos/:id/miembros` | Lista los colaboradores del proyecto con su rol (H2) | Miembro del proyecto (cualquier rol) |
| POST | `/api/proyectos/:id/miembros` | Agrega un colaborador por email con rol `EDITOR` o `READER` (H2) | `OWNER` |
| PATCH | `/api/proyectos/:id/miembros/:usuarioId` | Cambia el rol de un colaborador con invitación aceptada (H2) | `OWNER` |
| DELETE | `/api/proyectos/:id/miembros/:usuarioId` | Quita a un colaborador; si es uno mismo, es "No colaborar" (H2) | `OWNER` (a cualquiera) o el propio colaborador (a sí mismo) |
| GET | `/api/proyectos/:id/miembros/:usuarioId/aceptar` | Acepta una invitación pendiente (H2, clase 7) | El usuario invitado (nadie más) |
| GET | `/api/proyectos/:id/miembros/:usuarioId/rechazar` | Rechaza una invitación pendiente (H2, clase 7) | El usuario invitado (nadie más) |

**Endpoints públicos a propósito: ninguno.** Todos los de la tabla exigen sesión, y los que operan sobre
un proyecto verifican pertenencia y rol en el servidor. Las únicas rutas abiertas son las de Auth.js
(`/api/auth/*`), que las publica la librería para iniciar y cerrar sesión. `aceptar` y `rechazar` exigen
sesión igual que el resto, pero devuelven HTML en vez de JSON porque se abren desde un link de un
correo, no desde la interfaz.

**Orden de las preguntas en cada handler:** ¿hay sesión? (401) → ¿es colaborador con invitación
aceptada? (404) → ¿su rol alcanza? (403) → ¿el body está bien? (400) → ¿la regla lo permite? (409) →
hacer el trabajo. Una invitación pendiente o rechazada cuenta como "no es de este proyecto" (404) para
todo endpoint que no sea `aceptar`/`rechazar`: ver `docs/spec.md` H2.

## Respuestas exitosas

- `GET /api/proyectos` → `200`, arreglo (máx. 50) de `{ id, nombre, descripcion, creadoEn, owner: { id, nombre } }`.
- `POST /api/proyectos` → `201`, `{ id, nombre, descripcion, creadoEn, ownerId }`. Body: `{ nombre: string (obligatorio), descripcion?: string }`.
- `GET /api/proyectos/:id` → `200`, `{ id, nombre, descripcion, creadoEn, owner, miembros: [{ id, rol, usuario: { id, nombre, email } }] }`.
- `PUT /api/proyectos/:id` → `200`, el proyecto actualizado. Mismo body que la creación.
- `DELETE /api/proyectos/:id` → `204` sin cuerpo. Borra en cascada miembros, historias, actividades, conexiones y versiones (incluidas las cerradas, ver spec sección 3). La doble confirmación es responsabilidad de la UI.
- `POST /api/proyectos/:id/cerrar-version` → `200`, `{ cerrada: { id, estado, numeroVersion, numeroBuild, numeroPatch, nombre, descripcion, cerradaEl }, siguiente: { id, estado } }`. Body: `{ numeroVersion: int >= 0, numeroBuild: int >= 0, numeroPatch: int >= 0, nombre?: string, descripcion?: string }`.

- `GET /api/proyectos/:id/miembros` → `200`, arreglo (máx. 200) de `{ rol, estado, creadoEn, usuario: { id, nombre, email } }`. Si quien pide no es `OWNER`, la lista solo trae colaboradores en estado `ACEPTADA` (H2: los pendientes y rechazados solo los ve el dueño).
- `POST /api/proyectos/:id/miembros` → `201`, `{ rol, estado: "PENDIENTE", creadoEn, usuario }`. Body: `{ email: string, rol: "EDITOR" | "READER" }`. El email se compara sin distinguir mayúsculas. Dispara el correo de invitación (accesorio, ver sección de correos más abajo).
- `PATCH /api/proyectos/:id/miembros/:usuarioId` → `200`, `{ usuarioId, rol }`. Body: `{ rol: "EDITOR" | "READER" }`. Solo funciona sobre una invitación en estado `ACEPTADA`.
- `DELETE /api/proyectos/:id/miembros/:usuarioId` → `204` sin cuerpo. Dispara el correo de despedida (accesorio).
- `GET /api/proyectos/:id/miembros/:usuarioId/aceptar` → `200` HTML de confirmación. Pasa la invitación a `ACEPTADA`.
- `GET /api/proyectos/:id/miembros/:usuarioId/rechazar` → `200` HTML de confirmación. Pasa la invitación a `RECHAZADA`.

## Servicio externo: email transaccional (Resend)

Único módulo que le habla al proveedor: [`lib/servicios/mail.ts`](../lib/servicios/mail.ts). Timeout de
5s, hasta 3 intentos, nunca lanza (devuelve `boolean`), la API key se lee de `RESEND_API_KEY` y no sale
de ese archivo. Detalle completo (esencial/accesoria por operación, qué ve el usuario si falla) en
`docs/spec.md` sección 8. Resumen: las tres operaciones (invitar, despedida, aviso de eliminación) son
**accesorias** — el correo se intenta *después* de que la operación principal ya se completó en la base,
así que si Resend falla, la respuesta HTTP no cambia.

**Limitación del entorno de pruebas:** sin verificar un dominio propio en Resend, solo se puede enviar a
la casilla de la cuenta. Enviar a cualquier otro destinatario devuelve un 403 de Resend, que el módulo
trata igual que cualquier otra falla (log + `false`, sin romper la operación).

## Errores

Regla de status: **400** si alcanza con mirar el body para rechazarlo (Zod); **409** si hace falta el estado
del sistema para decidirlo (reglas en `lib/`); **401** sin sesión; **404** si el problema es la
pertenencia (no es miembro, o el proyecto no existe: no se revela cuál de las dos); **403** si el
problema es el rol. Todo error no previsto devuelve **500** con `"Error interno"` y el detalle solo
queda en el log del servidor.

| Operación | Situación | Status | Mensaje | Sale de la spec |
|---|---|---|---|---|
| POST `/api/proyectos` | El nombre está vacío | 400 | `El nombre del proyecto es obligatorio` (en `detalles.fieldErrors.nombre`) | H1, caso de error |
| POST `/api/proyectos`, PUT `/api/proyectos/:id` | El nombre supera 100 caracteres | 400 | `El nombre del proyecto no puede superar los 100 caracteres` (en `detalles.fieldErrors.nombre`) | H1, caso de error (longitud máxima, spec sección 3) |
| POST `/api/proyectos`, PUT `/api/proyectos/:id` | La descripción supera 500 caracteres | 400 | `La descripción del proyecto no puede superar los 500 caracteres` (en `detalles.fieldErrors.descripcion`) | H1, caso de error (longitud máxima, spec sección 3) |
| PUT `/api/proyectos/:id` | El nombre está vacío | 400 | `El nombre del proyecto es obligatorio` | H1, caso de error (misma regla al editar) |
| PUT `/api/proyectos/:id` | Es miembro pero no `OWNER` | 403 | `Tu rol en este proyecto no permite esta operación` | H1, caso de error |
| DELETE `/api/proyectos/:id` | Es miembro pero no `OWNER` | 403 | `Tu rol en este proyecto no permite esta operación` | H1, caso de error |
| GET/PUT/DELETE `/api/proyectos/:id`, POST `.../cerrar-version` | No es miembro del proyecto, o el proyecto no existe | 404 | `Proyecto no encontrado` | H9, caso de error (usuario que no pertenece al proyecto) |
| POST `.../cerrar-version` | Es miembro pero no `OWNER` ni `EDITOR` | 403 | `Tu rol en este proyecto no permite esta operación` | Sección 6: solo owner y editor modifican documentación |
| POST `.../cerrar-version` | `Version`, `Build` o `Patch` no son enteros no negativos | 400 | Mensaje de Zod por campo (en `detalles.fieldErrors`) | H8, caso de error |
| POST `.../cerrar-version` | El nombre supera 100 caracteres, o la descripción supera 1000 | 400 | `El nombre de la versión no puede superar los 100 caracteres` / `La descripción de la versión no puede superar los 1000 caracteres` (en `detalles.fieldErrors`) | H8, longitud máxima (spec sección 3) |
| POST `.../cerrar-version` | La combinación es `0.0.0` | 400 | `La combinación 0.0.0 no es válida` (en `detalles.fieldErrors.numeroPatch`) | H8, caso de error |
| POST `.../cerrar-version` | Ya existe una versión cerrada con esa combinación | 409 | `Ya existe una versión cerrada X.Y.Z en este proyecto` + `codigo: "VERSION_DUPLICADA"` y `versionExistente` | H8, caso de error |
| POST `.../cerrar-version` | La combinación queda por debajo de la última cerrada | 409 | `La versión X.Y.Z debe quedar por encima de la última versión cerrada (A.B.C)` + `codigo: "VERSION_NO_ASCENDENTE"` y `ultimaVersionCerrada` | H8, caso de error |
| POST `.../cerrar-version` | La version en desarrollo no tiene cambios | 409 | `La version en desarrollo no tiene cambios` + `codigo: "VERSION_SIN_CAMBIOS"` | H8, caso de error |
| POST `.../miembros` | El email no es válido, o el rol no es `EDITOR`/`READER` | 400 | Mensaje de Zod por campo (en `detalles.fieldErrors`) | H2 (solo se asignan editor y reader) |
| POST `.../miembros` | No hay ningún usuario con ese email | 409 | `Se ingresó un usuario inexistente` + `codigo: "USUARIO_INEXISTENTE"` | H2, caso de error |
| POST `.../miembros` | El email es el del owner | 409 | `El owner del proyecto no puede agregarse como colaborador` + `codigo: "ES_OWNER"` | H2, caso de error |
| POST `.../miembros` | El usuario ya tiene una invitación pendiente o aceptada | 409 | `Ese usuario ya es colaborador del proyecto` + `codigo: "YA_ES_MIEMBRO"` | H2, caso de error (mismo usuario dos veces). Si la invitación anterior está `RECHAZADA`, en cambio se re-invita (201) |
| POST `.../miembros`, PATCH `.../miembros/:usuarioId` | Es miembro pero no `OWNER` | 403 | `Tu rol en este proyecto no permite esta operación` | H2, caso de error |
| PATCH `.../miembros/:usuarioId` | El rol no es `EDITOR`/`READER` | 400 | Mensaje de Zod (en `detalles.fieldErrors.rol`) | H2 |
| PATCH `.../miembros/:usuarioId` | La invitación del usuario no está `ACEPTADA` (pendiente o rechazada) | 409 | `No se puede cambiar el rol de una invitación que no fue aceptada` + `codigo: "INVITACION_NO_ACEPTADA"` | H2: el rol solo tiene sentido una vez aceptada |
| PATCH/DELETE `.../miembros/:usuarioId` | El usuario indicado no es colaborador del proyecto | 404 | `El usuario no es colaborador de este proyecto` + `codigo: "NO_ES_MIEMBRO"` | H2 |
| PATCH/DELETE `.../miembros/:usuarioId` | El usuario indicado es el owner | 409 | `El owner no puede cambiar de rol ni dejar de colaborar: para eso puede eliminar el proyecto` + `codigo: "ES_OWNER"` | Sección 6: un solo owner |
| DELETE `.../miembros/:usuarioId` | Quien pide no es `OWNER` y el usuario indicado no es él mismo | 403 | `Tu rol en este proyecto no permite esta operación` | H2: solo el owner quita colaboradores; cada uno puede quitarse a sí mismo |
| GET `.../aceptar`, `.../rechazar` | Sin sesión | 401 (HTML) | Página pidiendo iniciar sesión con la cuenta invitada | H2 |
| GET `.../aceptar`, `.../rechazar` | La sesión no es la del usuario invitado | 403 (HTML) | Página "No es tu invitación" | H2: nadie acepta en nombre de otro |
| GET `.../aceptar`, `.../rechazar` | No hay invitación para ese usuario en ese proyecto | 404 (HTML) | Página "No encontramos esa invitación" | H2 |
| GET `.../aceptar`, `.../rechazar` | La invitación ya no está pendiente (ya aceptada o rechazada) | 409 (HTML) | Página "Esta invitación ya fue respondida antes" | H2 |
| Todas | No hay sesión | 401 | `No autenticado` | Sección 4: todas las historias asumen sesión iniciada |
| Todas | Error no previsto | 500 | `Error interno` | — |

Nota sobre el 409 de duplicada: además de la regla en `lib/versiones-proyecto.ts`, la base tiene un
`@@unique` sobre `(proyectoId, Version, Build, Patch)`. Si dos cierres simultáneos toman la misma
combinación, la base rechaza al segundo y el handler lo traduce al mismo 409 (nunca llega como 500).
