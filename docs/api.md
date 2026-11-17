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
| PUT | `/api/proyectos/:id` | Reemplaza nombre, descripción y definición del proyecto (H1, H13) | `OWNER` |
| DELETE | `/api/proyectos/:id` | Elimina el proyecto y todo su contenido en cascada (H1) | `OWNER` |
| GET | `/api/proyectos/:id/documentacion` | Historias, actividades y flechas vigentes de un build; `?build=<n>` para uno cerrado (H9) | Miembro del proyecto (cualquier rol) |
| POST | `/api/proyectos/:id/cambios` | Confirma un borrador: una versión nueva por elemento modificado (H3–H7, H10, H12) | `OWNER` o `EDITOR` |
| GET | `/api/proyectos/:id/cambios?desde=<fecha>` | Lo que otros usuarios confirmaron después de esa fecha (H12) | Miembro del proyecto (cualquier rol) |
| GET | `/api/proyectos/:id/historias/:historiaId/revisiones` | Historial de versiones de una historia (H4) | Miembro del proyecto (cualquier rol) |
| GET | `/api/proyectos/:id/actividades/:actividadId/revisiones` | Historial de versiones de una actividad (H6) | Miembro del proyecto (cualquier rol) |
| POST | `/api/proyectos/:id/cerrar-version` | Cierra la versión en desarrollo, vinculada a un entregable, y abre la siguiente (H8) | `OWNER` o `EDITOR` |
| POST | `/api/proyectos/:id/finalizar` | Finaliza el proyecto: cierra el build en desarrollo si tiene cambios o lo descarta si está vacío (H15) | `OWNER` |
| POST | `/api/proyectos/:id/reabrir` | Reabre un proyecto finalizado con un build en desarrollo nuevo (H15) | `OWNER` |
| GET | `/api/proyectos/:id/entregables` | Lista los entregables con las versiones cerradas de cada uno (H14) | Miembro del proyecto (cualquier rol) |
| POST | `/api/proyectos/:id/entregables` | Crea un entregable (H14) | `OWNER` |
| PUT | `/api/proyectos/:id/entregables/:entregableId` | Edita un entregable, incluido marcarlo como entregado (H14) | `OWNER` |
| DELETE | `/api/proyectos/:id/entregables/:entregableId` | Elimina un entregable sin versiones cerradas (H14) | `OWNER` |
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

- `GET /api/proyectos` → `200`, arreglo (máx. 50) de `{ id, nombre, descripcion, creadoEn, estado, owner: { id, nombre } }`. `estado` es `"EN_PROCESO"` o `"FINALIZADO"` (H15).
- `POST /api/proyectos` → `201`, `{ id, nombre, descripcion, creadoEn, ownerId }`. Body: `{ nombre: string (obligatorio), descripcion?: string }`.
- `GET /api/proyectos/:id` → `200`, `{ id, nombre, descripcion, creadoEn, estado, problemaNegocio, objetivo, limitesExclusiones, fechaInicio, fechaFinEstimada, owner, miembros: [{ id, rol, usuario: { id, nombre, email } }] }`. Las fechas de la definición son `"AAAA-MM-DD"` o `null`.
- `PUT /api/proyectos/:id` → `200`, el proyecto actualizado con su definición. Body: `{ nombre: string (obligatorio), descripcion?: string, problemaNegocio?: string, objetivo?: string, limitesExclusiones?: string[], fechaInicio?: "AAAA-MM-DD" | null, fechaFinEstimada?: "AAAA-MM-DD" | null }`. Es un **reemplazo completo**: los campos opcionales que no vienen quedan vacíos. La definición no se versiona (spec H13). `limitesExclusiones` no tiene límite de cantidad en la spec; el servidor corta en 1000 solo como protección técnica.
- `DELETE /api/proyectos/:id` → `204` sin cuerpo. Borra en cascada miembros, historias, actividades, conexiones y versiones (incluidas las cerradas, ver spec sección 3). La doble confirmación es responsabilidad de la UI.
- `GET /api/proyectos/:id/documentacion[?build=<n>]` → `200`, `{ build: { id, orden, estado, numeroVersion, numeroBuild, numeroPatch, nombre, descripcion, cerradaEl }, historias, actividades, conexiones }`. `n` es el `orden` del build (1, 2, 3… dentro del proyecto); sin `build` devuelve el build en desarrollo. Cada elemento trae `id`, `numeroVersion` (su versión vigente en ese build) y sus datos: historia `{ titulo, descripcion, criteriosAceptacion }`, actividad `{ nombre, documentacion, padreId, posicionX, posicionY, historiaIds }` (`padreId: null` = diagrama), flecha `{ origenId, destinoId }`. Solo vienen los elementos vigentes: los eliminados, y lo que depende de ellos, no aparecen (spec sección 3).
- `POST /api/proyectos/:id/cambios` → `200`, `{ revisiones: number, ids: { "<id temporal>": "<id definitivo>" } }`. Body: `{ historias: [], actividades: [], conexiones: [] }` (máx. 2000 por lista); cada elemento trae el estado completo que se quiere para él más `{ id, base, eliminado }`. `base` es la versión del elemento sobre la que se editó, o `null` si se creó en el borrador; en ese caso `id` es temporal y empieza con `nuevo-` (otros elementos del mismo body pueden referirse a él). Todo se escribe en una sola transacción: o entran todos los cambios o ninguno. Un elemento igual a su versión vigente no genera versión nueva.
- `GET /api/proyectos/:id/cambios?desde=<fecha ISO>` → `200`, `{ cambios: [{ tipo: "HISTORIA" | "ACTIVIDAD" | "CONEXION", elementoId, numeroVersion, actividadId, nombre, accion: "CREO" | "MODIFICO" | "ELIMINO", autor: { id, nombre }, creadoEn }], ahora }`. No incluye los cambios de quien pregunta. Una flecha se informa con el nombre de la actividad cuyo diagrama la contiene. `ahora` es la hora de la base: el cliente la usa como próximo `desde`.
- `GET /api/proyectos/:id/historias/:historiaId/revisiones` y `GET .../actividades/:actividadId/revisiones` → `200`, arreglo (máx. 500, de la más nueva a la más vieja) con los datos de cada versión más `{ numeroVersion, eliminado, creadoEn, autor: { id, nombre }, build }`; `build` es `"En desarrollo"` o el número `X.Y.Z` de la versión cerrada que la incluye.
- `POST /api/proyectos/:id/cerrar-version` → `200`, `{ cerrada: { id, estado, numeroVersion, numeroBuild, numeroPatch, nombre, descripcion, cerradaEl }, siguiente: { id, orden, estado } }`; `cerrada` incluye además `entregable: { id, nombre }`. Body: `{ numeroVersion: int >= 0, numeroBuild: int >= 0, numeroPatch: int >= 0, nombre?: string, descripcion?: string, entregableId: string }`.
- `POST /api/proyectos/:id/finalizar` → `200`, `{ estado: "FINALIZADO", cerrada }`. Body: `{ cierre?: <mismo body que cerrar-version> }`. Si el build en desarrollo tiene cambios, `cierre` es obligatorio y `cerrada` es la versión que se cerró; si está vacío, el build se descarta, `cierre` se ignora y `cerrada` es `null`. Con el proyecto finalizado no hay build en desarrollo: `GET .../documentacion` sin `?build` devuelve la última versión cerrada.
- `POST /api/proyectos/:id/reabrir` → `200`, `{ estado: "EN_PROCESO", siguiente: { id, orden, estado } }`. Sin body.
- `GET /api/proyectos/:id/entregables` → `200`, arreglo (máx. 500, por fecha estimada) de `{ id, nombre, descripcion, fechaEstimada, entregado, fechaEntrega, versiones: [{ orden, etiqueta }] }`. Fechas `"AAAA-MM-DD"`; `versiones` son los builds cerrados que apuntan al entregable. El estado (pendiente, atrasado…) no viene: lo calcula la pantalla con la fecha de hoy (spec sección 6).
- `POST /api/proyectos/:id/entregables` → `201`, el entregable creado. `PUT .../entregables/:entregableId` → `200`, el entregable actualizado. Body de ambos: `{ nombre: string, descripcion?: string, fechaEstimada: "AAAA-MM-DD", entregado?: boolean, fechaEntrega?: "AAAA-MM-DD" | null }`. Si `entregado` es `false`, la fecha de entrega se guarda vacía.
- `DELETE /api/proyectos/:id/entregables/:entregableId` → `204` sin cuerpo.

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
| POST `.../cambios`, GET `.../documentacion`, GET `.../cambios`, GET `.../revisiones` | No es miembro del proyecto, o el proyecto no existe | 404 | `Proyecto no encontrado` | H9 |
| POST `.../cambios` | Es miembro pero no `OWNER` ni `EDITOR` | 403 | `Tu rol en este proyecto no permite esta operación` | Sección 6: el lector solo consulta |
| POST `.../cambios` | El body no tiene la forma esperada, o un dato supera su largo máximo (título, criterio, nombre…), o una historia no tiene descripción o criterios | 400 | `Datos inválidos` + `detalles` de Zod | H3, H5, H10 (largos de la spec sección 3) |
| POST `.../cambios` | Otro usuario confirmó antes una versión de un elemento que este borrador también cambió (su `base` ya no es la vigente), o lo eliminó | 409 | `Otro usuario confirmó cambios sobre elementos de tu borrador` + `codigo: "CONFLICTO_DE_EDICION"` y `elementos: [{ tipo, id, nombre, motivo }]` | H12 |
| POST `.../cambios` | El resultado rompe una regla: título de historia repetido (sin distinguir mayúsculas ni espacios al borde), una actividad adentro de sí misma o de una interna suya, una flecha repetida o entre actividades de distintos diagramas, una actividad interna sin posición | 409 | `Los cambios no respetan las reglas del proyecto` + `codigo: "REGLA_DE_DOCUMENTACION"` y `elementos` | Sección 6 |
| GET `.../documentacion` | `build` no es un entero positivo | 400 | `Datos inválidos` + `detalles` | H9 |
| GET `.../documentacion` | No hay un build con ese número en el proyecto | 404 | `Versión no encontrada` | H9 |
| GET `.../cambios` | `desde` falta o no es una fecha ISO | 400 | `Datos inválidos` + `detalles` | H12 |
| GET `.../revisiones` | La historia o actividad no existe en ese proyecto | 404 | `Historia no encontrada` / `Actividad no encontrada` | H4, H6 |
| PUT `/api/proyectos/:id` | La fecha estimada de fin es anterior a la de inicio, una fecha no existe, un límite está vacío, o un campo supera su largo máximo | 400 | `Datos inválidos` + `detalles` de Zod por campo | H13 |
| POST `.../cerrar-version` | Falta `entregableId` | 400 | `Elegí el entregable al que corresponde la versión` (en `detalles.fieldErrors.entregableId`) | H8 |
| POST `.../cerrar-version` | El proyecto no tiene ningún entregable | 409 | `El proyecto todavía no tiene entregables: el dueño tiene que crear uno antes de cerrar la versión` + `codigo: "SIN_ENTREGABLES"` | H8, caso de error |
| POST `.../cerrar-version` | El entregable no existe en ese proyecto | 409 | `El entregable elegido no existe en este proyecto` + `codigo: "ENTREGABLE_INEXISTENTE"` | H8, caso de error |
| POST `.../finalizar`, `.../reabrir` | Es miembro pero no `OWNER` | 403 | `Tu rol en este proyecto no permite esta operación` | H15 |
| POST `.../finalizar` | El build en desarrollo tiene cambios y no vino `cierre` | 409 | `La versión en desarrollo tiene cambios: para finalizar hay que cerrarla con su número y su entregable` + `codigo: "CIERRE_REQUERIDO"` | H15 |
| POST `.../finalizar` | No hay versiones cerradas ni cambios en desarrollo | 409 | `No hay nada que finalizar: …` + `codigo: "NADA_QUE_FINALIZAR"` | H15, caso de error |
| POST `.../finalizar` | El proyecto ya está finalizado | 409 | `El proyecto ya está finalizado` + `codigo: "YA_FINALIZADO"` | H15 |
| POST `.../finalizar` | El `cierre` no respeta las reglas de H8 (número repetido o menor, entregable inexistente…) | 409 | Los mismos mensajes y códigos que `cerrar-version` | H15 / H8 |
| POST `.../reabrir` | El proyecto no está finalizado | 409 | `El proyecto no está finalizado` + `codigo: "PROYECTO_EN_PROCESO"` | H15 |
| POST `.../cambios`, `.../cerrar-version` | El proyecto está finalizado | 409 | `El proyecto fue finalizado: …` + `codigo: "PROYECTO_FINALIZADO"` | H15 |
| POST/PUT/DELETE `.../entregables` | Es miembro pero no `OWNER` | 403 | `Tu rol en este proyecto no permite esta operación` | H14 |
| POST/PUT `.../entregables` | Falta el nombre o la fecha estimada, un dato supera su largo, está entregado sin fecha de entrega, o la fecha de entrega es posterior a hoy | 400 | `Datos inválidos` + `detalles` de Zod por campo | H14 |
| PUT/DELETE `.../entregables/:entregableId` | El entregable no existe en ese proyecto | 404 | `Entregable no encontrado` | H14 |
| DELETE `.../entregables/:entregableId` | Lo referencia alguna versión cerrada | 409 | `No se puede eliminar: lo referencian las versiones X.Y.Z` + `codigo: "ENTREGABLE_CON_VERSIONES"` y `versiones` | H14, caso de error |
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
