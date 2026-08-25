# Especificacion del sistema - Documentacion versionada de proyectos

> Este documento es el relevamiento de requerimientos del proyecto.


## 1. El problema

**Para quien:** equipos chicos que desarrollan software en una cursada, proyecto academico o
equipo de trabajo, y necesitan mantener documentacion funcional sin perder el historial de cambios.

**Que hace hoy sin el sistema:** las historias de usuario, diagramas y decisiones del proyecto se
guardan en documentos sueltos, carpetas compartidas o archivos que se van pisando. Cuando llega una
entrega, parcial o demo, cuesta reconstruir como estaba documentado el proyecto en ese momento. Si
alguien cambia una historia o modifica un flujo, la version anterior se pierde o queda mezclada con
copias manuales como "final", "final final" o "entrega 1".

**Que mejora:** permite documentar un proyecto de software y conservar versiones anteriores de sus
historias de usuario, actividades y diagramas. Ademas permite crear checkpoints con nombre, como una
entrega de la cursada, que capturan el estado completo de la documentacion en un momento especifico.

## 2. Roles

| Rol | Quien es | Que puede hacer que el otro no |
|---|---|---|
| **Owner** | Creador o responsable del proyecto | Administrar miembros, cambiar roles, editar documentacion, crear checkpoints y eliminar elementos |
| **Editor** | Integrante del equipo que trabaja sobre la documentacion | Crear y modificar historias, actividades, diagramas y checkpoints |
| **Reader** | Docente, ayudante o integrante que solo consulta | Ver la documentacion actual, versiones anteriores y checkpoints sin modificar nada |

Todos los roles tienen cuenta. La diferencia principal esta en los permisos dentro de cada proyecto,
no necesariamente en el tipo de usuario global.

## 3. Entidades

Los sustantivos que aparecen en las historias de usuario. De aca sale el modelo de datos.

| Entidad | Que representa | Se relaciona con |
|---|---|---|
| **Usuario** | Persona con cuenta en el sistema | MiembroProyecto (1-N), Proyecto (N-N a traves de MiembroProyecto), versiones creadas |
| **Proyecto** | Espacio de trabajo donde vive la documentacion | MiembroProyecto (1-N), HistoriaUsuario (1-N), Actividad (1-N), Checkpoint (1-N) |
| **MiembroProyecto** | Relacion entre un usuario y un proyecto, con rol asignado | Usuario (N-1), Proyecto (N-1) |
| **HistoriaUsuario** | Identidad estable de una historia del proyecto | Proyecto (N-1), HistoriaUsuarioVersion (1-N), version actual |
| **HistoriaUsuarioVersion** | Revision inmutable de una historia de usuario | HistoriaUsuario (N-1), Usuario creador (N-1), CheckpointItem (1-N) |
| **Actividad** | Nodo estable del diagrama de actividades; puede tener una actividad padre | Proyecto (N-1), Actividad padre (N-1 opcional), ActividadVersion (1-N), conexiones |
| **ActividadVersion** | Revision inmutable de la documentacion de una actividad | Actividad (N-1), Usuario creador (N-1), CheckpointItem (1-N) |
| **ConexionActividad** | Flecha entre dos actividades del mismo diagrama | Actividad origen (N-1), Actividad destino (N-1), Proyecto (N-1) |
| **Checkpoint** | Hito con nombre que captura el estado completo de la documentacion | Proyecto (N-1), Usuario creador (N-1), CheckpointItem (1-N) |
| **CheckpointItem** | Referencia a la version exacta de una historia o actividad incluida en un checkpoint | Checkpoint (N-1), HistoriaUsuarioVersion o ActividadVersion |

**Relacion N-N:** un usuario participa en muchos proyectos y un proyecto tiene muchos usuarios, a
traves de `MiembroProyecto`.

**Versionado:** `HistoriaUsuario` y `Actividad` no se pisan. La entidad base conserva la identidad
del elemento y apunta a su version actual. Cada cambio crea una fila nueva en
`HistoriaUsuarioVersion` o `ActividadVersion`.

**Diagramas:** el diagrama se modela como nodos (`Actividad`) y flechas (`ConexionActividad`). Las
actividades anteriores y posteriores no se guardan como texto dentro de la actividad.

## 4. Historias de usuario

Formato: **Como** <rol>, **quiero** <accion>, **para** <beneficio>.
Cada historia lleva su criterio de aceptacion: como se verifica que esta terminada.

> **Todas las historias asumen que el usuario inicio sesion y pertenece al proyecto indicado**,
> salvo que se indique lo contrario.

### H1 - Crear un proyecto

**Como** owner, **quiero** crear un proyecto, **para** tener un espacio donde centralizar la
documentacion del equipo.

Criterios de aceptacion:
- [ ] Cuando el usuario carga nombre y descripcion del proyecto, entonces el proyecto queda creado
      y el usuario queda asociado como owner.
- [ ] Dado que el owner entra a su listado de proyectos, cuando se muestra la pantalla, entonces ve
      el proyecto creado.
- [ ] Caso de error: si el nombre esta vacio, no se guarda y se muestra el motivo.

### H2 - Administrar miembros del proyecto

**Como** owner, **quiero** agregar integrantes y asignarles un rol, **para** controlar quien puede
editar o solo consultar la documentacion.

Criterios de aceptacion:
- [ ] Cuando el owner agrega un usuario al proyecto con rol editor o reader, entonces el usuario
      aparece en la lista de miembros con ese rol.
- [ ] Dado que un miembro tiene rol reader, cuando intenta crear o modificar documentacion,
      entonces el sistema rechaza la accion.
- [ ] Caso de error: si quien intenta cambiar roles no es owner, el sistema responde 403 aunque la
      llamada no venga de la interfaz.

### H3 - Registrar una historia de usuario

**Como** editor, **quiero** cargar historias de usuario, **para** documentar que necesita el sistema
y con que criterios se valida.

Criterios de aceptacion:
- [ ] Cuando el editor carga titulo, descripcion, criterios de aceptacion, prioridad y estado,
      entonces se crea la historia y se genera automaticamente su version 1.
- [ ] Dado que la historia fue creada, cuando se abre su detalle, entonces se muestran sus datos
      actuales y su historial de versiones.
- [ ] Caso de error: si falta titulo o descripcion, no se guarda y se muestran los campos a corregir.

### H4 - Editar una historia sin perder versiones anteriores

**Como** editor, **quiero** modificar una historia de usuario, **para** mantener la documentacion
actualizada sin perder como estaba antes.

Criterios de aceptacion:
- [ ] Cuando el editor guarda cambios en una historia, entonces el sistema crea una nueva version y
      la marca como version actual.
- [ ] Dado que una historia tiene varias versiones, cuando se consulta el historial, entonces se ve
      el numero de version, fecha, autor y contenido de cada revision.
- [ ] Dado que se abre una version anterior, entonces el sistema la muestra en modo lectura y no
      modifica la version actual.

### H5 - Crear y editar un diagrama de actividades

**Como** editor, **quiero** armar un diagrama visual con actividades conectadas por flechas,
**para** representar el flujo funcional de una historia o proceso del proyecto.

Criterios de aceptacion:
- [ ] Cuando el editor crea una actividad en el diagrama, entonces aparece como un nodo visual con
      nombre y queda asociada al proyecto.
- [ ] Cuando el editor conecta dos actividades, entonces se crea una conexion origen-destino y se ve
      una flecha entre ambos nodos.
- [ ] Cuando el editor mueve una actividad, entonces se guarda su posicion y al volver al diagrama
      se muestra en el mismo lugar.
- [ ] Caso de error: si se intenta conectar una actividad con otra de un proyecto distinto, el
      sistema rechaza la accion.

### H6 - Documentar y versionar una actividad

**Como** editor, **quiero** editar la documentacion de una actividad, **para** explicar que ocurre
en ese paso del flujo y conservar su historial.

Criterios de aceptacion:
- [ ] Cuando el editor crea una actividad, entonces se genera su version 1 con nombre,
      documentacion y estado.
- [ ] Cuando el editor cambia el nombre, documentacion o estado de una actividad, entonces se crea
      una nueva version y la anterior queda disponible en el historial.
- [ ] Dado que una actividad tiene versiones anteriores, cuando se abre una version, entonces se
      muestra en modo lectura con fecha y autor.

### H7 - Navegar diagramas anidados

**Como** editor, **quiero** abrir el detalle interno de una actividad, **para** descomponer una
actividad grande en subactividades mas especificas.

Criterios de aceptacion:
- [ ] Cuando el usuario hace doble clic sobre una actividad, entonces se abre su diagrama interno.
- [ ] Dado que se esta dentro de un diagrama interno, cuando el usuario crea una actividad, entonces
      queda asociada como hija de la actividad padre.
- [ ] Dado que el usuario esta en un subdiagrama, cuando vuelve atras, entonces regresa al diagrama
      padre conservando el contexto.

### H8 - Crear un checkpoint

**Como** editor, **quiero** crear un checkpoint con nombre, **para** guardar el estado completo de
la documentacion en un hito importante.

Criterios de aceptacion:
- [ ] Cuando el editor carga nombre y descripcion del checkpoint, entonces el sistema guarda una
      referencia a la version actual de cada historia y actividad del proyecto.
- [ ] Dado que el proyecto sigue cambiando despues del checkpoint, cuando se consulta el checkpoint,
      entonces se siguen viendo las versiones que estaban vigentes al momento de crearlo.
- [ ] Caso de error: si el nombre del checkpoint esta vacio, no se guarda y se muestra el motivo.

### H9 - Consultar un checkpoint

**Como** reader, **quiero** consultar un checkpoint anterior, **para** ver como estaba documentado el
proyecto en una entrega o hito especifico.

Criterios de aceptacion:
- [ ] Dado que existe un checkpoint, cuando el usuario lo abre, entonces ve su nombre, fecha, autor
      y listado de historias y actividades incluidas.
- [ ] Cuando el usuario abre una historia o actividad desde un checkpoint, entonces ve exactamente
      la version referenciada por ese checkpoint.
- [ ] Dado que el usuario no pertenece al proyecto, cuando intenta abrir el checkpoint, entonces el
      sistema rechaza el acceso.

## 5. Flujo principal

El recorrido completo, paso a paso, del flujo que da valor al sistema (no un ABM).

1. El owner crea un proyecto y agrega integrantes con rol editor o reader.
2. Un editor registra historias de usuario con descripcion, criterios de aceptacion, prioridad y
   estado.
3. El equipo arma un diagrama visual creando actividades y conectandolas con flechas.
4. Si una actividad necesita mas detalle, el editor entra a su diagrama interno y crea
   subactividades.
5. Cada vez que se modifica una historia o actividad, el sistema crea una nueva version y conserva
   las anteriores.
6. Antes de una entrega, parcial o demo, el editor crea un checkpoint con nombre.
7. Mas adelante, cualquier miembro del proyecto puede consultar ese checkpoint para reconstruir como
   estaba la documentacion en ese momento.

## 6. Reglas de negocio

Las restricciones que **no** son obvias y que la IA no puede adivinar. Estas son las que hay que
revisar a mano.

- Una historia o actividad nunca se sobrescribe: cada guardado crea una version nueva e inmutable.
- La entidad base (`HistoriaUsuario` o `Actividad`) apunta a una sola version actual.
- El numero de version aumenta de a uno dentro de cada historia o actividad.
- Un checkpoint no copia toda la documentacion: guarda referencias a las versiones vigentes al
  momento de crearlo.
- Un checkpoint no cambia aunque despues se editen historias, actividades o diagramas.
- Solo owner y editor pueden crear o modificar documentacion.
- El reader puede consultar documentacion actual, versiones anteriores y checkpoints, pero no puede
  crear, editar ni eliminar.
- Solo el owner puede administrar miembros y roles del proyecto.
- Una actividad puede tener una actividad padre para representar diagramas anidados.
- Una conexion solo puede unir actividades del mismo proyecto y del mismo nivel de diagrama.
- Para reconstruir correctamente un checkpoint, tambien se debe conservar el estado de las
  conexiones del diagrama correspondientes a ese momento.
- No se implementan branches ni merges como Git; el sistema usa revisiones lineales inspiradas en
  Git.

## 7. Requisitos no funcionales

### Usabilidad

- **Eficiencia:** crear una actividad y conectarla con otra debe poder hacerse rapidamente desde el
  editor visual, sin cargar formularios largos.
- **Errores:** si falta un campo obligatorio, se senala el campo y no se pierde lo ya cargado.
- **Aprendizaje:** un integrante nuevo del equipo entiende donde crear historias, editar diagramas y
  consultar checkpoints sin una explicacion externa.
- **Recuerdo:** el acceso al proyecto, su documentacion actual, el historial y los checkpoints esta
  siempre disponible desde la navegacion principal.
- **Satisfaccion:** se prueba el flujo principal con una persona externa al equipo antes del Demo
  Day.

### Accesibilidad

Esta lista es **igual para todos los proyectos**: no hay que adaptarla, hay que cumplirla.

- [ ] Todo se puede operar **con el teclado**, y se ve donde esta el foco.
- [ ] Los campos de formulario tienen `label` asociado, no solo *placeholder*.
- [ ] Las imagenes que informan tienen texto alternativo; las decorativas, alternativo vacio.
- [ ] El **contraste** entre texto y fondo llega a **4,5:1** (3:1 si la letra es grande).
- [ ] El error nunca se comunica **solo con color**: siempre hay texto.

## 8. Integracion externa

**Cual:** no es obligatoria para el MVP.

**Para que podria usarse mas adelante:**
- Exportar checkpoints o documentacion a PDF.
- Sincronizar archivos con un repositorio o almacenamiento externo.
- Enviar notificaciones por mail cuando se crea un checkpoint o se invita a un miembro.

**Que pasa si no se implementa:**
- El sistema sigue siendo valido para el MVP mientras permita crear proyectos, versionar
  documentacion, armar diagramas y consultar checkpoints desde la aplicacion web.

## 9. Fuera de alcance

Lo que decidimos **no** hacer.

- **Branches y merges como Git.** El versionado es lineal por historia y por actividad.
- **Diff visual entre versiones.** Se podran consultar versiones anteriores, pero no comparar
  automaticamente cambios campo por campo.
- **Restaurar un checkpoint completo.** El MVP permite consultarlo, no volver todo el proyecto a ese
  estado.
- **Edicion colaborativa en tiempo real.** Dos usuarios no editan simultaneamente el mismo diagrama
  con sincronizacion instantanea.
- **Comentarios y aprobaciones.**
- **Notificaciones push.**
- **IA generando documentacion o diagramas.**
- **Epicas.** Pueden agregarse despues como agrupador de historias, pero no son imprescindibles para
  el MVP.
- **App nativa.** Es una aplicacion web y tiene que funcionar bien en escritorio y notebook; soporte
  movil basico si el equipo llega con tiempo.
