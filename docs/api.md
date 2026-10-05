# Contrato de la API

Contrato propuesto para los endpoints de proyectos. Cada fila indica qué hace la operación, qué rol puede realizarla y qué errores debe devolver. Todo responde JSON, salvo `204` (sin cuerpo).

> **Estado actual:** esta rama todavía no tiene Route Handlers en `app/api/`. Este documento y `api.http` definen el contrato y los casos que deberá cumplir la implementación. La sesión y la autorización por rol de proyecto se incorporan en la clase 6.

## Operaciones

| Método | Ruta | Qué hace | Rol | Errores |
| --- | --- | --- | --- | --- |
| GET | `/api/proyectos` | Lista los proyectos del usuario (máx. 50) | Cualquier usuario con sesión | 401 |
| POST | `/api/proyectos` | Crea un proyecto y deja al usuario como `OWNER` (H1) | Cualquier usuario con sesión | 400, 401 |
| GET | `/api/proyectos/:id` | Devuelve un proyecto con su owner y miembros | Miembro del proyecto | 404, 401 |
| PUT | `/api/proyectos/:id` | Edita nombre y descripción (H1) | `OWNER` | 400, 404, 401, 403 |
| DELETE | `/api/proyectos/:id` | Elimina el proyecto y todo su contenido en cascada (H1) | `OWNER` | 404, 401, 403 |
| POST | `/api/proyectos/:id/cerrar-version` | Cierra la versión en desarrollo y abre la siguiente (H8) | `OWNER` o `EDITOR` | 400, 404, 409, 401, 403 |

`POST .../cerrar-version` es la operación del flujo principal que no es un ABM: congela el estado documental del proyecto en un hito `Version.Build.Patch` y abre la siguiente versión en desarrollo.

## Cuerpos y respuestas

- `GET /api/proyectos` → `200`, arreglo de `{ id, nombre, descripcion, creadoEn, owner: { id, nombre } }`.
- `POST /api/proyectos` → `201`, `{ id, nombre, descripcion, creadoEn, ownerId }`. Body: `{ nombre: string (obligatorio), descripcion?: string }`.
- `GET /api/proyectos/:id` → `200`, `{ id, nombre, descripcion, creadoEn, owner, miembros: [{ id, rol, usuario: { id, nombre, email } }] }`.
- `PUT /api/proyectos/:id` → `200`, el proyecto actualizado. Body: `{ nombre: string (obligatorio), descripcion?: string }`.
- `DELETE /api/proyectos/:id` → `204` sin cuerpo. Borra en cascada miembros, historias, actividades, conexiones y versiones, incluidas las cerradas (spec, sección 3). La doble confirmación es responsabilidad de la UI.
- `POST /api/proyectos/:id/cerrar-version` → `200`, `{ cerrada: { id, estado, numeroVersion, numeroBuild, numeroPatch, nombre, descripcion, cerradaEl }, siguiente: { id, estado } }`. Body: `{ numeroVersion: int >= 0, numeroBuild: int >= 0, numeroPatch: int >= 0, nombre?: string, descripcion?: string }`.

## Errores esperados

| Operación | Situación | Status |
| --- | --- | --- |
| POST `/api/proyectos`, PUT `/api/proyectos/:id` | El nombre está vacío o el body no es JSON válido | 400 |
| POST `.../cerrar-version` | `Version`, `Build` o `Patch` no son enteros no negativos, o la combinación es `0.0.0` | 400 |
| GET/PUT/DELETE `/api/proyectos/:id`, POST `.../cerrar-version` | El proyecto no existe | 404 |
| POST `.../cerrar-version` | Ya existe una versión cerrada con esa combinación o no queda por encima de la última cerrada | 409 |
| Todas | No hay sesión | 401 |
| PUT/DELETE `/api/proyectos/:id` | Es miembro pero no `OWNER` | 403 |
| POST `.../cerrar-version` | Es miembro pero no `OWNER` ni `EDITOR` | 403 |
| GET `/api/proyectos/:id` y las demás con `:id` | El usuario no es miembro del proyecto | 404 |

El catálogo completo de mensajes de error y la trazabilidad con las historias de la especificación se completan junto con los Route Handlers.
