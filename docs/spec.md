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
historias de usuario, actividades y diagramas. El proyecto siempre tiene una **version en
desarrollo** (donde se edita), que se crea junto con el proyecto, y que el equipo puede **cerrar** en
cualquier momento, identificandola con el formato `Version.Build.Patch` (por ejemplo `1.2.9`) como
una entrega de la cursada; al cerrarla, el sistema abre automaticamente la siguiente version en
desarrollo.

> **Nota de terminologia:** este documento usaba antes el termino "Checkpoint" para este concepto.
> Se renombro a **"Version de proyecto"** para dejar mas claro que representa un hito con nombre del
> proyecto completo. No hay que confundirla con la "version" (numero entero simple, 1, 2, 3...) que
> ya tiene cada `HistoriaUsuario` o `Actividad` individual cada vez que se edita — son dos conceptos
> distintos que conviven en la UI.

## 2. Roles

| Rol | Quién es | Qué puede hacer |
|---|---|---|
| **Dueño** | Creador y titular del proyecto. En la práctica suele ser el PO o el PM | Todo lo que hace un Editor, y además administrar colaboradores y roles, editar la definición del proyecto y sus entregables, y eliminar el proyecto |
| **Editor** | Integrante que trabaja sobre la documentación: analista funcional, arquitecto, desarrollador | Crear, modificar y eliminar historias de usuario, actividades y flechas, y cerrar versiones de proyecto |
| **Lector** | Docente, ayudante o integrante que solo consulta | Ver la documentación actual, el historial de cada elemento, las versiones de proyecto cerradas, la definición del proyecto y sus entregables, sin modificar nada |

Todos los roles tienen cuenta. La diferencia está en los permisos dentro de cada proyecto, no en el
tipo de usuario global. Un proyecto tiene exactamente un dueño: quien lo creó. El dueño aparece en
la lista de colaboradores del proyecto con rol Dueño (ver sección 4, H2).

## 3. Entidades

Los sustantivos que aparecen en las historias de usuario. De acá sale el modelo de datos.

### Elementos versionables

Un **elemento versionable** es cualquier pieza de la documentación que el sistema conserva en el
tiempo: hoy son las **historias de usuario**, las **actividades** y las **flechas** (conexiones entre
actividades). Más adelante pueden sumarse otros tipos (por ejemplo, diagramas de entidades) con el
mismo mecanismo.

Cada tipo se guarda en dos tablas:

- **La identidad** (`HistoriaUsuario`, `Actividad`, `ConexionActividad`): solo el `id` y el proyecto.
  No cambia nunca. Existe para que las referencias entre elementos estén garantizadas por la base
  (una flecha no puede apuntar a una actividad que no existe).
- **Las revisiones** (`HistoriaUsuarioVersion`, `ActividadVersion`, `ConexionActividadVersion`): una
  fila por cada cambio confirmado. Nunca se modifican ni se borran. Toda la información del elemento
  vive acá.

Toda revisión, sea del tipo que sea, tiene estos campos:

| Campo | Qué guarda |
|---|---|
| **Versión del elemento** (`numeroVersion`) | 1 al crearlo; sube de a uno con cada cambio confirmado |
| **Build** (`versionProyectoId`) | La versión de proyecto que estaba en desarrollo cuando se confirmó el cambio |
| **Eliminado** | Si esa revisión da de baja al elemento (ver "Eliminar no borra" más abajo) |
| **Autor** y **fecha** | Quién confirmó el cambio y cuándo. La fecha de creación del elemento es la de su versión 1 |

Y además, los datos propios de cada tipo:

| Revisión | Datos propios |
|---|---|
| `HistoriaUsuarioVersion` | Título, descripción y criterios de aceptación |
| `ActividadVersion` | Tipo (actividad o nodo de control, ver abajo), nombre, documentación, actividad padre (o ninguna), posición X e Y en el lienzo, e historias de usuario asociadas |
| `ConexionActividadVersion` | Actividad de origen, actividad de destino y guarda (condición opcional, H16) |
| `CarrilVersion` | Diagrama al que pertenece, nombre, posición X y ancho en el lienzo (H17) |

**Las referencias apuntan al `id` del elemento, no a una versión.** El padre de una actividad, el
origen y el destino de una flecha, las historias asociadas a una actividad y el diagrama de un carril
guardan el `id` del elemento referido. Qué versión de ese elemento corresponde se resuelve con la regla de
reconstrucción de un build (sección 6), así que editar un elemento no obliga a crear revisiones de los
que lo referencian.

### Todas las entidades

| Entidad | Qué representa | Se relaciona con |
|---|---|---|
| **Usuario** | Persona con cuenta en el sistema | MiembroProyecto (1-N), Proyecto (N-N a través de MiembroProyecto), revisiones que escribió |
| **Proyecto** | Espacio de trabajo donde vive la documentación. Guarda además su **definición** (ver abajo) y su **estado**: en proceso o finalizado (H15) | MiembroProyecto (1-N), elementos versionables (1-N), VersionProyecto (1-N), Entregable (1-N) |
| **Entregable** | Algo que el proyecto se compromete a entregar, con una fecha estimada. Lo planifica el dueño y se marca como entregado cuando se entrega | Proyecto (N-1), VersionProyecto (1-N: los builds cerrados que lo documentan) |
| **MiembroProyecto** | Relación entre un usuario y un proyecto: rol asignado y estado de la invitación (pendiente, aceptada o rechazada) | Usuario (N-1), Proyecto (N-1) |
| **HistoriaUsuario** / **HistoriaUsuarioVersion** | Identidad y revisiones de una historia de usuario. El título es único dentro del proyecto | Proyecto (N-1), actividades que la referencian |
| **Actividad** / **ActividadVersion** | Identidad y revisiones de una actividad. Una actividad **sin padre** es un **diagrama**; las que tienen padre son los nodos de su diagrama interno | Proyecto (N-1), actividad padre (N-1 opcional), historias asociadas (N-N), flechas |
| **ConexionActividad** / **ConexionActividadVersion** | Identidad y revisiones de una flecha entre dos actividades del mismo diagrama | Actividad origen (N-1), actividad destino (N-1), Proyecto (N-1) |
| **Carril** / **CarrilVersion** | Identidad y revisiones de un carril: una franja vertical con nombre en el lienzo de un diagrama (H17) | Actividad cuyo diagrama divide (N-1), Proyecto (N-1) |
| **VersionProyecto** | Un **build** del proyecto. Está `en_desarrollo` (sin número, es donde se trabaja; siempre hay exactamente una por proyecto) o `cerrada` (identificada por `Version.Build.Patch`). Tiene un número de orden correlativo dentro del proyecto (1, 2, 3...) que ordena los builds. No tiene autor. Al cerrarse queda vinculado a un entregable | Proyecto (N-1), revisiones confirmadas durante ese build (1-N), Entregable (N-1; obligatorio al cerrar) |

**Relaciones N-N:** un usuario participa en muchos proyectos y un proyecto tiene muchos usuarios, a
través de `MiembroProyecto`. Una actividad puede asociarse a varias historias y una historia tener
varias actividades asociadas; la asociación se guarda en cada revisión de la actividad.

**Tipos de nodo (H16).** Un nodo del lienzo es una **actividad** o un **nodo de control** de UML, y
todos se guardan como `Actividad` / `ActividadVersion` con un tipo. Así comparten el versionado, la
posición, las flechas, la concurrencia y el borrado sin duplicar nada:

| Tipo | Se dibuja como | Qué puede tener |
|---|---|---|
| **Actividad** | Rectángulo redondeado con su nombre | Nombre, documentación, historias asociadas, diagrama interno. Puede ser un diagrama (sin padre) |
| **Nodo inicial** | Círculo relleno | Solo posición en el lienzo de su padre |
| **Nodo final de actividad** | Círculo relleno dentro de otro círculo | Ídem |
| **Nodo final de flujo** | Círculo con una cruz | Ídem |
| **Decisión / combinación** | Rombo | Ídem. Decide (una entrada, varias salidas) o combina (varias entradas, una salida) según sus flechas |
| **Bifurcación / unión** | Barra gruesa horizontal | Ídem. Bifurca (una entrada, varias salidas) o une (varias entradas, una salida) según sus flechas |

Los nodos de control no tienen nombre, documentación, historias asociadas ni diagrama interno, y
siempre están dentro de un diagrama. El tipo de un nodo se elige al crearlo y no cambia.

**Carriles (H17).** Un carril es una franja vertical con nombre que divide el lienzo de un diagrama,
por ejemplo para mostrar qué área o rol realiza cada parte del proceso. Es un elemento **solo visual**:
guarda su propia posición X y su ancho, y ocupa todo el alto del lienzo. **No se registra qué nodos
están dentro de un carril**: un nodo que se ve sobre un carril no tiene ninguna relación guardada con
él. Pertenece a un diagrama (una actividad de tipo actividad, de cualquier nivel) y no cambia de
diagrama.

**Diagramas:** un diagrama es una actividad sin padre. Sus actividades hijas son los nodos de su
lienzo, y las flechas unen hijas del mismo padre. Una actividad hija puede tener a su vez hijas: ese es
su diagrama interno (diagramas anidados). Un proyecto puede tener todos los diagramas que el equipo
necesite.

**Asociación con historias de usuario:** se define desde la actividad (cualquier actividad, de
cualquier nivel), no desde la historia. La historia muestra la lista de actividades asociadas,
calculada a partir de las actividades que la referencian en el build que se está mirando.

**Eliminar no borra.** Eliminar una historia, una actividad, una flecha o un carril crea una revisión
nueva marcada **eliminado**. Desde ese build el elemento deja de aparecer; los builds anteriores lo siguen
mostrando tal como estaba, porque su revisión vigente en ellos no está marcada como eliminada.

**Definición del proyecto.** Además de nombre y descripción, el proyecto guarda los datos que el dueño
redacta al definirlo, siguiendo la lista de verificación del enfoque de un proyecto (Gray y Larson,
*Administración de proyectos*). Todos son opcionales:

| Campo | Qué guarda |
|---|---|
| **Problema de negocio** | El problema u oportunidad que origina el proyecto |
| **Objetivo del proyecto** | Qué se busca lograr |
| **Límites y exclusiones** | Lista de lo que el proyecto no incluye |
| **Fecha de inicio** y **fecha estimada de fin** | Fechas (sin hora) |

La definición **no se versiona**: no pertenece a ningún build y al guardarla se reemplaza la anterior.
Al mirar una versión cerrada se ve la definición actual.

**Entregables y builds.** Un build documenta cómo tiene que funcionar lo que se va a entregar, no
algo ya terminado: el equipo puede documentar builds de entregas futuras que todavía no se
empezaron a desarrollar. Por eso la fecha de cierre de un build (`cerradaEl`) solo dice cuándo se
terminó de documentar, y las fechas de la entrega viven en el **entregable**:

| Campo del entregable | Qué guarda |
|---|---|
| **Nombre** | Obligatorio |
| **Descripción** | Opcional. Por ejemplo, que un entregable es la suma de otros que se hacen en paralelo |
| **Fecha estimada de entrega** | Obligatoria |
| **Entregado** | Sí o no |
| **Fecha de entrega** | Obligatoria si está entregado |

Cada build cerrado apunta a un entregable, y un entregable puede tener varios builds (por ejemplo, el
que lo documenta y otro que lo corrige). El **estado** del entregable no se carga: se calcula
(ver sección 6).

**`VersionProyecto` no tiene un "autor".** Un build documenta el estado del proyecto en un momento, no
algo que una persona firma; por eso no se le atribuye autoría como a una revisión. Quién la cerró no
se muestra ni se comunica por mail.

**Longitudes máximas.** Según estándares comunes:

| Campo | Longitud máxima |
|---|---|
| Nombre de proyecto | 100 caracteres |
| Descripción de proyecto | 500 caracteres |
| Título de historia | 150 caracteres |
| Descripción de historia | 2000 caracteres |
| Cada criterio de aceptación | 1000 caracteres |
| Nombre de actividad | 100 caracteres |
| Guarda de una flecha | 100 caracteres |
| Nombre de carril | 100 caracteres |
| Documentación de actividad | 5000 caracteres |
| Nombre de versión de proyecto | 100 caracteres |
| Descripción de versión de proyecto | 1000 caracteres |
| Problema de negocio | 2000 caracteres |
| Objetivo del proyecto | 1000 caracteres |
| Cada límite o exclusión (sin límite de cantidad) | 300 caracteres |
| Nombre de entregable | 100 caracteres |
| Descripción de entregable | 1000 caracteres |

**Ancho de un carril:** entre 120 y 2000 píxeles del lienzo.

**Reglas de borrado en la base.** El producto nunca borra elementos versionables (los marca como
eliminados). Estas reglas aplican cuando se borra un registro de la base:

| Si se borra... | Pasa con... | Regla |
|---|---|---|
| Usuario (no dueño de ningún proyecto) | sus `MiembroProyecto` | se borran en cascada |
| Usuario que es dueño de algún proyecto | ese `Proyecto` | **no se permite** borrar el usuario mientras siga siendo dueño de un proyecto (no existe una funcionalidad para transferir la titularidad, ver sección 9) |
| Usuario que escribió revisiones | esas revisiones | **no se permite**: una revisión conserva su autor. Si el usuario deja de ser colaborador, sus revisiones lo siguen mostrando como autor |
| Proyecto | sus colaboradores, sus elementos versionables con todas sus revisiones, sus `VersionProyecto` (incluidas las **cerradas**) y sus entregables | se borra todo en cascada, sin excepción. Por eso la UI advierte que se pierde todo (incluido el historial) y pide una segunda confirmación |
| Identidad de un elemento | sus revisiones | se borran en cascada (solo ocurre al borrar el proyecto) |
| Actividad referenciada como padre, origen, destino o diagrama de un carril, o historia referenciada desde una actividad | la revisión que la referencia | **no se permite**: una revisión nunca queda con una referencia rota |
| `VersionProyecto` con revisiones confirmadas en ese build | esas revisiones | **no se permite** |
| Entregable al que apunta algún build cerrado | ese build | **no se permite**: un build cerrado nunca queda sin su entregable |

## 4. Historias de usuario

Formato: **Como** <rol>, **quiero** <accion>, **para** <beneficio>.
Cada historia lleva sus criterios de aceptacion: como se verifica que esta terminada. Cada criterio
describe una sola regla o comportamiento.

Las historias se agrupan por funcionalidad: **H*n*** es el grupo y **H*n*.*m*** cada historia. Una
referencia a un grupo (por ejemplo, "ver H12") abarca todas sus historias.

> **Todas las historias asumen que el usuario inicio sesion y pertenece al proyecto indicado**,
> salvo que se indique lo contrario.

### H1 - Proyectos

#### H1.1 - Crear un proyecto

**Como** dueño, **quiero** crear un proyecto, **para** tener un espacio donde centralizar la
documentacion del equipo.

Criterios de aceptacion:
- [ ] Cuando el usuario carga nombre y descripcion del proyecto, entonces el proyecto queda creado.
- [ ] Quien crea el proyecto queda asociado como su dueño.
- [ ] Dado que el dueño entra a su listado de proyectos, cuando se muestra la pantalla, entonces ve
      el proyecto creado.
- [ ] Los nombres de proyecto pueden repetirse entre proyectos distintos: no hace falta que sean
      unicos.
- [ ] Caso de error: si el nombre esta vacio, no se guarda y se muestra el motivo.
- [ ] Caso de error: si el nombre o la descripcion superan la longitud maxima (ver seccion 3), no se
      guarda y se muestra el motivo.

#### H1.2 - Editar los datos del proyecto

**Como** dueño, **quiero** corregir el nombre y la descripcion del proyecto, **para** mantenerlos al
dia.

Criterios de aceptacion:
- [ ] Cuando el dueño edita nombre o descripcion del proyecto, entonces los cambios quedan guardados.
- [ ] Ningun otro rol puede editar el nombre ni la descripcion.
- [ ] Caso de error: si quien intenta editar el proyecto no es su dueño, el sistema rechaza la accion
      aunque la llamada no venga de la interfaz.

#### H1.3 - Eliminar un proyecto

**Como** dueño, **quiero** eliminar un proyecto que ya no se usa, **para** que deje de ocupar lugar en
el listado del equipo.

Criterios de aceptacion:
- [ ] Cuando el dueño elimina el proyecto, el sistema le advierte que se va a perder toda la
      documentacion, incluidas las versiones cerradas (ver regla de borrado en la seccion 3).
- [ ] El sistema pide confirmar la eliminacion una segunda vez antes de ejecutarla.
- [ ] Al eliminarlo, los colaboradores del proyecto reciben un correo electronico avisandoles (ver
      seccion 8).
- [ ] Ningun otro rol puede eliminar el proyecto.
- [ ] Caso de error: si quien intenta eliminar el proyecto no es su dueño, el sistema rechaza la
      accion aunque la llamada no venga de la interfaz.

### H2 - Colaboradores del proyecto

> En la interfaz, la seccion **"Colaboradores"** de la informacion del proyecto tiene un boton que
> abre una ventana emergente. Arriba hay un cuadro de texto donde el dueño escribe el email de un
> usuario, y al lado elige el rol con el que lo invita (**Editor** o **Lector**); con cada `Enter` lo
> agrega a la lista de abajo. Cada proyecto tiene su propia lista de colaboradores, con su estado de
> invitacion (pendiente, aceptada o rechazada).
>
> El circuito de invitacion por correo (enviarla, que el usuario invitado la acepte o la rechace
> desde ahi, y que el dueño pueda re-invitar a quien rechazo) se implemento en la clase 7. Ver
> `lib/servicios/mail.ts` y los endpoints `.../aceptar` y `.../rechazar` en `docs/api.md`.

#### H2.1 - Invitar a un colaborador

**Como** dueño, **quiero** invitar a un usuario con un rol, **para** controlar quien puede editar o
solo consultar la documentacion.

Criterios de aceptacion:
- [ ] Cuando el dueño ingresa el email de un usuario existente y le asigna rol editor o lector,
      entonces se crea una invitacion con ese rol y aparece en la lista de colaboradores del dueño.
- [ ] La invitacion nueva queda en estado **pendiente**.
- [ ] El usuario invitado recibe un correo electronico con la invitacion (ver seccion 8).
- [ ] Mientras la invitacion este pendiente, el usuario invitado no tiene acceso al proyecto (no
      cuenta como colaborador a los efectos de los permisos).
- [ ] Dado que un colaborador tiene rol lector, cuando intenta crear o modificar documentacion,
      entonces el sistema rechaza la accion.
- [ ] El dueño puede volver a invitar a un usuario cuya invitacion anterior esta en estado
      **rechazada**: se comporta como una invitacion nueva (vuelve a pendiente y se reenvia el correo).
- [ ] Caso de error: si el email ingresado no corresponde a ningun usuario, no se agrega y se marca
      la caja en rojo con el mensaje "Se ingresó un usuario inexistente": el dueño es notificado de que
      el usuario que quiere invitar no existe.
- [ ] Caso de error: si el dueño ingresa su propio email, no se agrega: el dueño ya es titular del
      proyecto y no puede figurar como invitado.
- [ ] Caso de error: si el dueño ingresa dos o mas veces el mismo usuario, no se agrega de nuevo a la
      lista.
- [ ] Caso de error: si quien intenta invitar no es el dueño, el sistema responde 403 aunque la
      llamada no venga de la interfaz.

#### H2.2 - Responder una invitacion

**Como** usuario invitado, **quiero** aceptar o rechazar una invitacion desde el correo, **para**
decidir si participo del proyecto.

Criterios de aceptacion:
- [ ] Cuando el usuario invitado acepta la invitacion desde el correo, su estado pasa a **aceptada**.
- [ ] Con la invitacion aceptada, el usuario tiene acceso al proyecto con el rol asignado.
- [ ] Cuando el usuario invitado rechaza la invitacion desde el correo, su estado pasa a
      **rechazada** y no tiene acceso al proyecto.
- [ ] No se le avisa al dueño cuando un usuario rechaza su invitacion.

#### H2.3 - Ver los colaboradores

**Como** colaborador, **quiero** ver quienes participan del proyecto y con que rol, **para** saber con
quien estoy trabajando.

Criterios de aceptacion:
- [ ] Cualquier colaborador abre la misma ventana de colaboradores; si no es el dueño, la ve en solo
      lectura.
- [ ] Los colaboradores en estado **aceptada** son visibles para cualquier colaborador del proyecto.
- [ ] Los colaboradores en estado **pendiente** o **rechazada** solo son visibles para el dueño.
- [ ] En la pantalla de inicio cada usuario ve los proyectos en los que participa.

#### H2.4 - Cambiar el rol de un colaborador

**Como** dueño, **quiero** cambiar el rol de un colaborador, **para** darle o quitarle permiso de
edicion.

Criterios de aceptacion:
- [ ] Cuando el dueño cambia el rol de un colaborador con invitacion aceptada entre editor y lector,
      el cambio queda guardado.
- [ ] No se envia correo por un cambio de rol.
- [ ] El rol de una invitacion pendiente no se cambia (el correo ya salio con ese rol): para
      corregirlo, el dueño la quita y vuelve a invitar.
- [ ] Caso de error: si quien intenta cambiar un rol no es el dueño, el sistema responde 403 aunque la
      llamada no venga de la interfaz.

#### H2.5 - Quitar a un colaborador

**Como** dueño, **quiero** quitar a un colaborador del proyecto, **para** que deje de tener acceso.

Criterios de aceptacion:
- [ ] Cuando el dueño quita a un colaborador de la lista (con invitacion aceptada, pendiente o
      rechazada), el colaborador pierde -o no llega a tener- acceso al proyecto.
- [ ] El colaborador quitado recibe un correo electronico de despedida (ver seccion 8).
- [ ] Caso de error: si quien intenta quitar a un colaborador no es el dueño, el sistema responde 403
      aunque la llamada no venga de la interfaz.

#### H2.6 - Dejar de colaborar en un proyecto

**Como** colaborador de un proyecto ajeno, **quiero** dejar de colaborar, **para** que el proyecto no
siga apareciendo entre los mios.

Criterios de aceptacion:
- [ ] Dado que un usuario es colaborador (con invitacion aceptada) de un proyecto ajeno, ve un boton
      **"No colaborar"** dentro del cuadro de ese proyecto, a la derecha.
- [ ] El boton no aparece en los proyectos propios ni en los que el usuario no es colaborador.
- [ ] Cuando lo usa, deja de ser colaborador y pierde el acceso al proyecto.
- [ ] El dueño recibe un correo electronico avisando que el usuario dejo de colaborar (ver seccion 8).

> No hay un maximo de colaboradores por proyecto.
>
> **Mejoras futuras, no pedidas por ninguna clase y no implementadas:** un limite contra el spam de
> invitaciones repetidas (cuantas veces o cada cuanto se puede re-invitar al mismo usuario), y avisarle
> al dueño cuando un usuario rechaza su invitacion (hoy no se le avisa).

> **Cómo se guarda cualquier cambio de H3 a H11:** las ediciones se acumulan en un **borrador** y
> recién se registran al tocar **"Confirmar cambios"** (ver H12). Cuando un criterio dice "se crea",
> "se guarda" o "se elimina", quiere decir: al confirmar.

### H3 - Registrar historias de usuario

#### H3.1 - Registrar una historia de usuario

**Como** dueño o editor, **quiero** cargar historias de usuario, **para** documentar qué necesita el
sistema y con qué criterios se valida.

Criterios de aceptación:
- [ ] Desde la barra lateral (ver H11), en el acordeón "Historias de usuario", el usuario elige el botón
      **+** ("Nueva historia") y carga título, descripción y criterios de aceptación (uno o más).
- [ ] Al confirmar, la historia queda creada con su versión 1, registrada en el build en desarrollo.
- [ ] Caso de error: si falta título o descripción, no se puede confirmar y se marcan los campos a
      corregir.
- [ ] Caso de error: si no hay al menos un criterio de aceptación, no se puede confirmar.
- [ ] Caso de error: si el título ya existe en otra historia vigente del mismo proyecto, no se guarda y
      se muestra el motivo. El título identifica la historia para el equipo.
- [ ] El título se compara sin distinguir mayúsculas/minúsculas ni espacios al borde, pero sin ignorar
      acentos ni espacios internos.
- [ ] Caso de error: si el título, la descripción o algún criterio superan la longitud máxima (ver
      sección 3), no se guarda y se muestra el motivo.

### H4 - Editar, consultar y eliminar historias

#### H4.1 - Editar una historia

**Como** dueño o editor, **quiero** modificar una historia de usuario, **para** mantener la
documentación al día sin perder cómo estaba antes.

Criterios de aceptación:
- [ ] Cuando se confirma un cambio en una historia, el sistema crea una revisión nueva (versión del
      elemento + 1) en el build en desarrollo.
- [ ] Caso de error: si el nuevo título ya existe en otra historia vigente (misma regla que en H3), no
      se guarda y se muestra el motivo.
- [ ] Caso de error: si los datos quedan iguales a la revisión vigente, no se crea una revisión nueva.
- [ ] Caso de error: si algún campo supera la longitud máxima, no se guarda y se muestra el motivo.

#### H4.2 - Consultar el historial de una historia

**Como** colaborador, **quiero** ver las versiones anteriores de una historia, **para** saber cómo
cambió y quién la cambió.

Criterios de aceptación:
- [ ] El detalle de la historia muestra sus datos y su **historial**: versión del elemento, build,
      fecha, autor y contenido de cada revisión.
- [ ] Abrir una revisión anterior la muestra en modo lectura, sin modificar la actual.

#### H4.3 - Ver las actividades asociadas a una historia

**Como** colaborador, **quiero** ver qué actividades implementan una historia, **para** ir de lo que se
pide a cómo se resuelve.

Criterios de aceptación:
- [ ] El detalle de la historia muestra la **lista de actividades asociadas**: las actividades que la
      referencian en el build que se está mirando (ver H6).
- [ ] Desde la lista se puede ir a cada actividad.

#### H4.4 - Eliminar una historia

**Como** dueño o editor, **quiero** eliminar una historia que ya no aplica, **para** que deje de
formar parte de la documentación vigente.

Criterios de aceptación:
- [ ] Cuando el usuario elimina una historia, el sistema le pide confirmación.
- [ ] Al confirmar, se crea una revisión marcada eliminado: desde ese build la historia no aparece.
- [ ] Las actividades que tenían asociada la historia eliminada dejan de mostrarla.

### H5 - Diagramas de actividades

#### H5.1 - Crear un diagrama

**Como** dueño o editor, **quiero** crear todos los diagramas que necesite el proyecto, **para**
representar cada proceso funcional por separado.

Criterios de aceptación:
- [ ] Desde la barra lateral, en el acordeón "Diagramas de actividades", el usuario elige el botón **+**
      ("Nuevo diagrama", ver H11) y carga un nombre.
- [ ] El diagrama es una actividad sin padre: tiene nombre, documentación e historias asociadas como
      cualquier actividad (ver H6).
- [ ] Un diagrama no tiene posición, porque no se dibuja en ningún lienzo.
- [ ] Un proyecto puede tener cualquier cantidad de diagramas. La barra lateral los lista a todos.
- [ ] Caso de error: si el nombre está vacío o supera la longitud máxima, no se guarda y se muestra el
      motivo.

#### H5.2 - Ver el lienzo de un diagrama

**Como** colaborador, **quiero** abrir un diagrama, **para** ver cómo está modelado el proceso.

Criterios de aceptación:
- [ ] Al abrir un diagrama se ve su lienzo, con las actividades hijas y las flechas entre ellas.

#### H5.3 - Desplazar y acercar la vista del lienzo

**Como** colaborador, **quiero** mover y acercar la vista de un diagrama, **para** recorrer diagramas
más grandes que la pantalla.

Criterios de aceptación:
- [ ] El lienzo no tiene barras de desplazamiento.
- [ ] El usuario desplaza la vista manteniendo apretado el botón principal del mouse sobre el fondo y
      arrastrando.
- [ ] Con el cursor sobre el lienzo, la rueda del mouse acerca o aleja la vista, hacia donde está el
      cursor.
- [ ] Desplazar o acercar la vista no cambia las posiciones de las actividades ni genera cambios.
- [ ] Cada diagrama se abre con la vista inicial.

### H6 - Actividades

#### H6.1 - Crear una actividad

**Como** dueño o editor, **quiero** agregar actividades a un diagrama, **para** describir los pasos de
un proceso.

Criterios de aceptación:
- [ ] Dentro del lienzo de un diagrama, el usuario crea una actividad: aparece como un nodo con su
      nombre.
- [ ] La actividad creada queda como hija del diagrama abierto.

#### H6.2 - Documentar una actividad

**Como** dueño o editor, **quiero** ponerle nombre y documentación a una actividad, **para** explicar
qué ocurre en ese paso.

Criterios de aceptación:
- [ ] El usuario edita el nombre y la documentación de una actividad.
- [ ] Caso de error: si el nombre está vacío, no se guarda y se muestra el motivo.
- [ ] Caso de error: si el nombre o la documentación superan la longitud máxima, no se guarda y se
      muestra el motivo.

#### H6.3 - Asociar historias a una actividad

**Como** dueño o editor, **quiero** asociar una actividad a las historias de usuario que implementa,
**para** relacionar lo que se pide con cómo se resuelve.

Criterios de aceptación:
- [ ] El usuario asocia una actividad (de cualquier nivel, incluido un diagrama) a una o más historias
      de usuario vigentes del proyecto.
- [ ] El usuario puede quitar asociaciones.
- [ ] Los datos de la actividad muestran solo las historias asociadas, como etiquetas en orden
      alfabético.
- [ ] Cada etiqueta tiene una × para quitar la asociación.
- [ ] Debajo de las etiquetas, un buscador lista las historias vigentes que todavía no están asociadas:
      todas al entrar al campo, o las que contienen el texto escrito, sin distinguir mayúsculas ni
      tildes.
- [ ] Al elegir una historia del buscador, se asocia.
- [ ] El buscador se usa con el mouse o con el teclado (flechas, `Enter` y `Escape`).
- [ ] En solo lectura se ven las etiquetas, sin la × ni el buscador.

#### H6.4 - Mover una actividad en el lienzo

**Como** dueño o editor, **quiero** acomodar las actividades en el lienzo, **para** que el diagrama
se lea bien.

Criterios de aceptación:
- [ ] El usuario mueve una actividad dentro del lienzo arrastrándola, o con el teclado.
- [ ] Al confirmar, la posición final queda guardada en una revisión nueva: al volver al diagrama, y al
      mirar ese build más adelante, la actividad está en el mismo lugar.
- [ ] Arrastrar una actividad varias veces antes de confirmar genera una sola revisión.

#### H6.5 - Versionar los cambios de una actividad

**Como** colaborador, **quiero** que cada cambio de una actividad quede registrado, **para** poder ver
cómo estaba antes.

Criterios de aceptación:
- [ ] Cada cambio confirmado (nombre, documentación, posición, padre o historias asociadas) crea una
      revisión nueva de la actividad.
- [ ] La actividad tiene el mismo historial que una historia (ver H4).
- [ ] Caso de error: si los datos quedan iguales a la revisión vigente, no se crea una revisión nueva.

#### H6.6 - Eliminar una actividad

**Como** dueño o editor, **quiero** eliminar una actividad que ya no forma parte del proceso, **para**
que el diagrama refleje cómo se trabaja hoy.

Criterios de aceptación:
- [ ] Cuando el usuario elimina una actividad, el sistema le avisa que también se eliminan sus
      actividades internas (y las internas de esas, en todos los niveles).
- [ ] El aviso incluye que también se eliminan las flechas que tocan a cualquiera de esas actividades.
- [ ] El sistema pide confirmación antes de eliminar.
- [ ] Al confirmar, todas quedan marcadas eliminado en el build en desarrollo.

### H7 - Diagramas anidados

#### H7.1 - Abrir el diagrama interno de una actividad

**Como** dueño o editor, **quiero** abrir el diagrama interno de una actividad, **para** descomponer
una actividad grande en subactividades.

Criterios de aceptación:
- [ ] Cuando el usuario hace doble clic sobre una actividad (o la selecciona y presiona `Enter`), se
      abre su diagrama interno.
- [ ] Dentro del diagrama interno, las actividades que se crean quedan como hijas de esa actividad.
- [ ] Una ruta de navegación ("migas de pan") muestra en qué nivel está el usuario.
- [ ] Desde la ruta de navegación el usuario vuelve a cualquier nivel superior conservando el contexto.

#### H7.2 - Mover una actividad a otro padre

**Como** dueño o editor, **quiero** mover una actividad a otro diagrama, **para** reorganizar la
documentación sin perder su historial.

Criterios de aceptación:
- [ ] El usuario puede mover una actividad a cualquier otra actividad del mismo proyecto, o a ninguna
      (pasa a ser un diagrama).
- [ ] No hay límite de profundidad.
- [ ] Si la actividad que se mueve tiene flechas, el sistema avisa que se van a quitar (una flecha solo
      une actividades del mismo diagrama).
- [ ] Las flechas de la actividad movida se eliminan en el mismo cambio.
- [ ] Caso de error: no se puede mover una actividad a sí misma ni a una de sus actividades internas
      (en cualquier nivel): crearía una contención circular.

### H8 - Cerrar la versión en desarrollo

#### H8.1 - Cerrar y numerar la versión en desarrollo

**Como** dueño o editor, **quiero** cerrar la versión en desarrollo asignándole `Version.Build.Patch`,
**para** dejar registrado el estado completo de la documentación en un hito.

Criterios de aceptación:
- [ ] El selector de versión (arriba a la derecha, ver H9) siempre muestra una entrada "En desarrollo"
      y la opción de cerrarla.
- [ ] El formulario de cierre propone un `Version.Build.Patch`: mismo Version y Build que la última
      versión cerrada, con Patch + 1; o `0.0.1` si no se cerró ninguna.
- [ ] El número propuesto es editable antes de confirmar.
- [ ] El formulario pide un nombre y una descripción opcionales.
- [ ] Al confirmar, el build en desarrollo pasa a `cerrada` con esos datos.
- [ ] Al cerrar una versión, el sistema abre automáticamente el build en desarrollo siguiente.
- [ ] No se copia ninguna documentación: el estado del build cerrado queda definido por las revisiones
      confirmadas hasta ese momento (ver la regla de reconstrucción en la sección 6).
- [ ] Si el usuario tiene cambios sin confirmar, el sistema le pide confirmarlos o descartarlos antes
      de cerrar la versión.
- [ ] Caso de error: `Version`, `Build` y `Patch` deben ser enteros no negativos.
- [ ] Caso de error: `0.0.0` no es una versión válida.
- [ ] Caso de error: no puede haber dos versiones cerradas del mismo proyecto con la misma combinación.
- [ ] Caso de error: la versión a cerrar debe quedar por encima de la última cerrada (orden `Version`,
      luego `Build`, luego `Patch`). Se pueden saltear números, pero no retroceder.
- [ ] Caso de error: si en el build en desarrollo no se confirmó ningún cambio (crear, modificar,
      mover, conectar o eliminar cualquier elemento), no se puede cerrar y el sistema avisa que no hay
      cambios.

#### H8.2 - Vincular la versión a un entregable

**Como** dueño o editor, **quiero** indicar a qué entregable corresponde la versión que cierro,
**para** saber qué se documentó para cada entrega.

Criterios de aceptación:
- [ ] El formulario de cierre pide elegir, de forma obligatoria, a qué entregable del proyecto
      corresponde el build (ver H14).
- [ ] Cada entregable se muestra con su fecha estimada y su estado.
- [ ] Se puede elegir cualquier entregable, incluso uno ya entregado (por ejemplo, para un build que lo
      corrige).
- [ ] Caso de error: si el proyecto todavía no tiene ningún entregable, no se puede cerrar la versión y
      el sistema avisa que primero el dueño tiene que crear uno.
- [ ] Caso de error: el entregable elegido tiene que existir y pertenecer al mismo proyecto.

### H9 - Consultar una versión cerrada

#### H9.1 - Elegir una versión cerrada

**Como** cualquier colaborador, **quiero** elegir una versión cerrada del proyecto, **para** saber qué
se entregó en un hito.

Criterios de aceptación:
- [ ] El proyecto tiene un selector de versión arriba a la derecha. Por defecto muestra "En
      desarrollo".
- [ ] Al elegir una versión cerrada, la etiqueta del selector muestra su `Version.Build.Patch`.
- [ ] Se ve el número, el nombre, la descripción y la fecha de cierre de la versión.
- [ ] Se ve el entregable al que corresponde la versión.
- [ ] Un botón "Volver a la versión actual" regresa al build en desarrollo (en un proyecto finalizado,
      a la última versión cerrada; ver H15).
- [ ] Caso de error: si el usuario no pertenece al proyecto, el sistema rechaza el acceso.

#### H9.2 - Ver la documentación como estaba al cerrar la versión

**Como** cualquier colaborador, **quiero** ver la documentación exactamente como estaba en una
versión cerrada, **para** consultar lo entregado sin riesgo de modificarlo.

Criterios de aceptación:
- [ ] Al elegir una versión cerrada, toda la pantalla pasa a **solo lectura**.
- [ ] Se ven las historias con el contenido que tenían al cerrar la versión.
- [ ] Se ven los diagramas con sus actividades **en las mismas posiciones**.
- [ ] Se ve la misma jerarquía de diagramas anidados.
- [ ] Se ven las mismas flechas y las mismas asociaciones con historias.

### H10 - Flechas

#### H10.1 - Conectar dos elementos con una flecha

**Como** dueño o editor, **quiero** unir actividades con flechas, **para** representar el orden de un
proceso.

Criterios de aceptación:
- [ ] Dentro de un lienzo, el usuario elige "Conectar elementos" (la figura de una flecha en la barra de
      herramientas, ver H16) y crea una flecha eligiendo un elemento de origen y uno de destino.
- [ ] Volver a elegir "Conectar elementos" cancela la conexión.
- [ ] La flecha se dibuja sola, de borde a borde de los nodos.
- [ ] Las flechas se versionan como cualquier elemento: al mirar un build cerrado se ven las flechas
      que existían en ese momento.
- [ ] Caso de error: si ya existe una flecha con el mismo origen y destino, no se crea otra; el
      sistema resalta la existente.
- [ ] Caso de error: no se puede unir actividades de distinto diagrama (de distinto padre) ni de otro
      proyecto.
- [ ] Caso de error: los diagramas (actividades sin padre) no se conectan con flechas.

#### H10.2 - Modelar repeticiones con flechas

**Como** dueño o editor, **quiero** dibujar ciclos y flechas de una actividad hacia sí misma, **para**
modelar procesos repetitivos.

Criterios de aceptación:
- [ ] Se permite una flecha de una actividad hacia sí misma.
- [ ] Se permiten ciclos (A → B → A).
- [ ] Un nodo de control no puede tener una flecha hacia sí mismo (H16).

#### H10.3 - Eliminar una flecha

**Como** dueño o editor, **quiero** eliminar una flecha, **para** corregir el orden del proceso.

Criterios de aceptación:
- [ ] El usuario elimina una flecha sin eliminar las actividades que une.

### H11 - Barra lateral

#### H11.1 - Navegar los elementos desde la barra lateral

**Como** colaborador, **quiero** ver todos los elementos del proyecto en un solo lugar, **para**
llegar rápido a lo que necesito.

Criterios de aceptación:
- [ ] La pantalla del proyecto tiene una barra lateral a la izquierda con "Proyecto" (abre la
      información del proyecto) y un acordeón por tipo de elemento versionable: "Historias de usuario"
      y "Diagramas de actividades".
- [ ] Los tres títulos de la barra se muestran con el mismo estilo.
- [ ] Seleccionar un elemento en la barra abre su detalle en el panel principal.
- [ ] La barra respeta el build que se está mirando: en una versión cerrada muestra los elementos de
      ese momento.

#### H11.2 - Usar los acordeones de la barra

**Como** colaborador, **quiero** que la barra mantenga su tamaño y muestre un tipo de elemento a la
vez, **para** no perder de vista el resto de la pantalla.

Criterios de aceptación:
- [ ] La barra tiene un alto fijo en pantallas anchas: no cambia al abrir o cerrar un acordeón.
- [ ] Solo un acordeón está abierto a la vez: abrir uno cierra el otro.
- [ ] El acordeón abierto ocupa el alto que dejan libre los títulos; si su contenido no entra, se
      desplaza dentro del acordeón.
- [ ] Si la ventana es baja, el acordeón abierto conserva un alto mínimo.
- [ ] Si aun así no entra todo, la barra se desplaza por dentro: ningún título, botón o separador queda
      fuera de la barra.

#### H11.3 - Recorrer el árbol de diagramas

**Como** colaborador, **quiero** ver los diagramas como un árbol, **para** entender cómo se
descompone cada proceso.

Criterios de aceptación:
- [ ] El acordeón "Diagramas de actividades" muestra un árbol de diagramas: cada diagrama (actividad sin
      padre) y, debajo, las actividades que tienen su propio diagrama interno, en todos los niveles.
- [ ] Las actividades que no tienen nada adentro no se listan: se ven en el lienzo del diagrama que las
      contiene. Cuando una actividad recibe su primer elemento interno, pasa a listarse.
- [ ] Cada elemento del árbol que tiene actividades internas se puede desplegar y plegar.
- [ ] Al entrar, los niveles arrancan plegados, salvo el camino hasta el elemento que se está viendo.
- [ ] El árbol no tiene sangría: al desplegar un elemento, sus actividades internas se listan debajo
      de él, alineadas con él.
- [ ] La flecha girada de un elemento indica que está desplegado.
- [ ] Un nombre que no entra se ve completo al pasar el mouse.

#### H11.4 - Filtrar los elementos de la barra

**Como** colaborador, **quiero** filtrar los elementos de un acordeón por texto, **para** encontrar
una historia o una actividad en particular.

Criterios de aceptación:
- [ ] Debajo del título de cada acordeón abierto hay un **filtro**.
- [ ] Al escribir en el filtro, el acordeón muestra solo los elementos cuyo título o nombre contiene el
      texto, sin distinguir mayúsculas ni tildes.
- [ ] En "Diagramas de actividades" se ven también las actividades que contienen a cada coincidencia
      (para saber dónde está), con esas ramas desplegadas; el resto se oculta.
- [ ] El filtro también encuentra las actividades que no se listan (las que no tienen nada adentro): en
      su lugar se ve el diagrama que las contiene, con su camino.
- [ ] Si nada coincide, se avisa.
- [ ] Cada acordeón tiene su propio filtro.
- [ ] Al borrar el texto del filtro, el árbol vuelve a mostrarse plegado y desplegado como estaba.

#### H11.5 - Crear elementos desde la barra

**Como** dueño o editor, **quiero** crear una historia o un diagrama desde la barra, **para** no tener
que ir a otra pantalla.

Criterios de aceptación:
- [ ] A la derecha del filtro de cada acordeón hay un botón **+** que crea un elemento de ese acordeón.
- [ ] Al pasar el mouse sobre el botón **+** se ve qué crea: "Nueva historia" o "Nuevo diagrama".
- [ ] Quien solo consulta (lector, o una versión cerrada) ve el filtro sin el botón **+**.

#### H11.6 - Usar la barra en pantallas angostas

**Como** colaborador, **quiero** alcanzar la barra desde un celular o una ventana angosta, **para**
navegar el proyecto desde cualquier dispositivo.

Criterios de aceptación:
- [ ] Desde pantallas medianas (48rem de ancho) la barra está a la izquierda del contenido.
- [ ] En pantallas más angostas la barra no ocupa lugar fijo: un botón **"Elementos"** en la barra fija
      del proyecto (la de "Confirmar cambios", siempre visible) la abre como panel deslizable desde la
      izquierda.
- [ ] Al elegir un elemento en el panel deslizable, el panel se cierra.

### H12 - Confirmar cambios y trabajar en simultáneo

#### H12.1 - Acumular los cambios en un borrador

**Como** dueño o editor, **quiero** que mis ediciones se acumulen antes de guardarlas, **para** no
generar versiones por cada gesto.

Criterios de aceptación:
- [ ] Las ediciones (crear, modificar, mover, conectar, asociar o eliminar) se acumulan en un borrador
      que vive en el navegador y no tocan la base.
- [ ] Un botón "Descartar cambios" vuelve al estado confirmado.
- [ ] Si el usuario intenta salir con cambios sin confirmar, el sistema le avisa.

#### H12.2 - Confirmar los cambios

**Como** dueño o editor, **quiero** confirmar mis cambios de una sola vez, **para** registrar una
versión coherente de todo lo que modifiqué.

Criterios de aceptación:
- [ ] El botón **"Confirmar cambios"** está siempre visible.
- [ ] El botón está gris y deshabilitado si no hay cambios, y toma el color de acción cuando hay
      cambios pendientes.
- [ ] El botón no muestra la cantidad de cambios.
- [ ] Al confirmar, se crea **una revisión por elemento modificado** (no una por gesto).
- [ ] Todas las revisiones se guardan en una sola operación: o se guardan todas, o ninguna.

#### H12.3 - Enterarme de lo que confirmaron otros

**Como** dueño o editor, **quiero** enterarme de los cambios que confirmaron los demás, **para**
trabajar sobre la documentación actualizada.

Criterios de aceptación:
- [ ] Si otro usuario confirma cambios, quien **no** tiene borrador ve la pantalla actualizada sola.
- [ ] Si otro usuario confirma cambios y el usuario **sí** tiene borrador, su pantalla no se recarga.
- [ ] En ese caso aparece un botón en la cabecera, junto al selector de versión, que abre una ventana
      con los cambios agrupados por usuario, por ejemplo: "Cambios realizados por Juan: Se modificó
      Actividad Facturación".
- [ ] Un cambio en una flecha se informa como un cambio en la actividad cuyo diagrama la contiene.

#### H12.4 - Evitar pisar el trabajo de otro

**Como** dueño o editor, **quiero** que el sistema me frene si otro cambió lo mismo que yo, **para**
no pisar su trabajo.

Criterios de aceptación:
- [ ] Si otro usuario confirmó cambios sobre un elemento que el usuario actual tiene modificado en su
      borrador, el botón "Confirmar cambios" se pone **amarillo**: avisa que la confirmación va a ser
      rechazada.
- [ ] Caso de error: al confirmar, si otro usuario ya confirmó una revisión más nueva de algún elemento
      del borrador, el sistema rechaza toda la confirmación.
- [ ] Caso de error: al confirmar, si otro usuario eliminó un elemento al que el borrador hace
      referencia, el sistema rechaza toda la confirmación.
- [ ] Al rechazar, el sistema dice qué elementos tienen conflicto y ofrece recargarlos.
- [ ] No hay fusión automática de cambios.

> **Lector:** ve la misma pantalla en modo lectura, sin borrador ni botones de edición.

### H13 - Definición del proyecto

#### H13.1 - Definir el proyecto

**Como** dueño, **quiero** dejar escrito el problema de negocio, el objetivo, los límites y las fechas
del proyecto, **para** que todo el equipo entienda por qué existe y qué incluye.

Criterios de aceptación:
- [ ] En "Información del proyecto", el dueño edita nombre, descripción, problema de negocio, objetivo
      del proyecto, límites y exclusiones (una lista), fecha de inicio y fecha estimada de fin.
- [ ] La definición se guarda con un botón propio: no forma parte de "Confirmar cambios" ni de ningún
      build.
- [ ] Todos los campos son opcionales salvo el nombre.
- [ ] Caso de error: si un campo supera su longitud máxima (ver sección 3), no se guarda y se muestra
      el motivo.
- [ ] Caso de error: si la fecha estimada de fin es anterior a la fecha de inicio, no se guarda y se
      muestra el motivo.
- [ ] Caso de error: si quien intenta guardar no es el dueño, el sistema rechaza la acción aunque la
      llamada no venga de la interfaz.

#### H13.2 - Consultar la definición del proyecto

**Como** colaborador, **quiero** leer la definición del proyecto, **para** entender su alcance.

Criterios de aceptación:
- [ ] El resto de los colaboradores ve los mismos datos en solo lectura.
- [ ] Al mirar una versión cerrada se ve la definición actual del proyecto.

### H14 - Entregables

#### H14.1 - Planificar un entregable

**Como** dueño, **quiero** planificar los entregables del proyecto con su fecha estimada, **para**
que el equipo sepa qué se comprometió y para cuándo.

Criterios de aceptación:
- [ ] El dueño crea un entregable con nombre, descripción opcional y fecha estimada de entrega.
- [ ] El dueño puede editar un entregable después de crearlo.
- [ ] Caso de error: si falta el nombre o la fecha estimada, no se guarda y se muestra el motivo.
- [ ] Caso de error: si un campo supera su longitud máxima, no se guarda y se muestra el motivo.
- [ ] Caso de error: si quien intenta crear o editar un entregable no es el dueño, el sistema rechaza la
      acción aunque la llamada no venga de la interfaz.

#### H14.2 - Registrar una entrega

**Como** dueño, **quiero** marcar cuándo se entregó cada entregable, **para** que el equipo vea si
cumplió lo comprometido.

Criterios de aceptación:
- [ ] El dueño marca un entregable como entregado indicando la fecha de entrega.
- [ ] El dueño puede desmarcar un entregable entregado (por ejemplo, si el cliente lo rechaza).
- [ ] Para marcarlo como entregado no hace falta que tenga builds cerrados.
- [ ] La fecha de entrega puede ser posterior a la fecha estimada: en ese caso queda "Entregado con
      atraso".
- [ ] Caso de error: si se marca como entregado sin fecha de entrega, no se guarda y se muestra el
      motivo.
- [ ] Caso de error: si la fecha de entrega todavía no llegó (es posterior a hoy), no se guarda y se
      muestra el motivo.

#### H14.3 - Ver el estado de los entregables

**Como** colaborador, **quiero** ver los entregables con su estado, **para** saber si vamos atrasados
contra lo comprometido.

Criterios de aceptación:
- [ ] En "Información del proyecto" se listan los entregables, ordenados por fecha estimada.
- [ ] Cada entregable muestra su estado y los builds cerrados que apuntan a él.
- [ ] El estado se calcula solo: **Pendiente**, **Atrasado**, **Entregado a tiempo** o **Entregado con
      atraso** (ver sección 6).
- [ ] El resto de los colaboradores ve los entregables y su estado en solo lectura.

#### H14.4 - Eliminar un entregable

**Como** dueño, **quiero** eliminar un entregable que ya no corresponde, **para** que la planificación
refleje lo comprometido.

Criterios de aceptación:
- [ ] El dueño puede eliminar un entregable al que no apunta ningún build cerrado.
- [ ] Caso de error: si se intenta eliminar un entregable al que apunta algún build cerrado, no se
      elimina y se avisa qué versiones lo referencian.
- [ ] Caso de error: si quien intenta eliminar un entregable no es el dueño, el sistema rechaza la
      acción aunque la llamada no venga de la interfaz.

### H15 - Finalizar y reabrir el proyecto

#### H15.1 - Finalizar el proyecto

**Como** dueño, **quiero** finalizar el proyecto cuando se terminó de documentar, **para** que no quede
un build "En desarrollo" invitando a seguir documentando algo cerrado.

Criterios de aceptación:
- [ ] En "Información del proyecto" el dueño ve "Finalizar proyecto". Ningún otro rol ve la opción.
- [ ] Si el build en desarrollo tiene cambios confirmados, "Finalizar proyecto" abre la misma ventana
      que cerrar una versión (H8: número, entregable, nombre y descripción).
- [ ] Al confirmar esa ventana, el build se cierra con esos datos y **no** se abre uno nuevo: el
      proyecto queda finalizado.
- [ ] Si el build en desarrollo no tiene cambios, solo se pide confirmar: ese build vacío se descarta y
      el proyecto queda finalizado en su última versión cerrada.
- [ ] Si el dueño tiene cambios sin confirmar, el sistema le pide confirmarlos o descartarlos antes de
      finalizar (como en H8).
- [ ] No se pide un motivo para finalizar.
- [ ] Finalizar no exige que los entregables estén entregados.
- [ ] Caso de error: si el proyecto nunca cerró una versión y el build en desarrollo no tiene cambios,
      no hay nada que finalizar y el sistema lo avisa.
- [ ] Caso de error: si quien intenta finalizar no es el dueño, el sistema rechaza la acción aunque la
      llamada no venga de la interfaz.

#### H15.2 - Consultar un proyecto finalizado

**Como** colaborador, **quiero** que un proyecto finalizado quede protegido contra cambios, **para**
que su documentación final no se modifique por error.

Criterios de aceptación:
- [ ] Con el proyecto finalizado no hay build "En desarrollo".
- [ ] El selector de versión solo muestra las versiones cerradas y la pantalla abre en la última.
- [ ] Nadie puede crear, modificar ni eliminar documentación ni cerrar versiones.
- [ ] El dueño sigue pudiendo editar la definición del proyecto, los entregables (por ejemplo, marcar
      uno como entregado) y los colaboradores.
- [ ] Si otro usuario tenía cambios sin confirmar, al confirmarlos el sistema los rechaza y le avisa
      que el proyecto fue finalizado.
- [ ] En "Mis proyectos", cada tarjeta indica si el proyecto está **En proceso** o **Finalizado**.

#### H15.3 - Reabrir el proyecto

**Como** dueño, **quiero** reabrir un proyecto finalizado, **para** seguir documentándolo si hace
falta.

Criterios de aceptación:
- [ ] Con el proyecto finalizado, el dueño ve "Reabrir proyecto".
- [ ] Al confirmarlo se abre un build en desarrollo nuevo y el proyecto vuelve a estar en proceso.
- [ ] La numeración de las versiones sigue desde la última cerrada.
- [ ] No se pide un motivo para reabrir.
- [ ] Caso de error: si quien intenta reabrir no es el dueño, el sistema rechaza la acción aunque la
      llamada no venga de la interfaz.

### H16 - Nodos de control

#### H16.1 - Agregar elementos desde la barra de figuras

**Como** dueño o editor, **quiero** agregar cada elemento del diagrama desde su figura, **para**
reconocer qué agrego antes de hacer clic.

Criterios de aceptación:
- [ ] La barra de herramientas del lienzo muestra la figura de cada elemento que se puede agregar:
      **actividad**, **nodo inicial**, **nodo final de actividad**, **nodo final de flujo**,
      **decisión** y **bifurcación**, cada una con su forma de UML (ver sección 3).
- [ ] La barra muestra también la figura de una flecha, para **conectar elementos** (H10).
- [ ] Al hacer clic en una figura, el elemento se agrega al diagrama.
- [ ] Al pasar el mouse sobre una figura se ve su nombre: "Actividad", "Nodo inicial", "Nodo final de
      actividad", "Nodo final de flujo", "Decisión", "Bifurcación" y "Conectar elementos".

#### H16.2 - Usar nodos de control en un diagrama

**Como** dueño o editor, **quiero** agregar nodos inicial, final, de decisión y de bifurcación,
**para** modelar un diagrama de actividades completo según UML.

Criterios de aceptación:
- [ ] Los nodos de control se mueven, se conectan con flechas, se eliminan y se versionan igual que
      las actividades.
- [ ] Los nodos de control se guardan con "Confirmar cambios" (H12).
- [ ] Los nodos de control no aparecen en la barra lateral: solo en el lienzo de su diagrama.
- [ ] Al elegir un nodo de control en el lienzo, el panel muestra su tipo y la opción de eliminarlo.
- [ ] Un nodo de control no tiene nombre, documentación, historias asociadas ni diagrama interno.
- [ ] Al mirar una versión cerrada se ven los nodos de control tal como estaban.
- [ ] Caso de error: un nodo de control no puede ser un diagrama ni moverse fuera de uno (siempre tiene
      padre).

#### H16.3 - Respetar las reglas de UML en las flechas

**Como** dueño o editor, **quiero** que el sistema me impida dibujar flechas sin sentido en UML,
**para** que los diagramas sean correctos.

Criterios de aceptación:
- [ ] Caso de error: un nodo inicial no puede tener flechas que entren.
- [ ] Caso de error: un nodo final (de actividad o de flujo) no puede tener flechas que salgan.
- [ ] Caso de error: un nodo de control no puede tener una flecha hacia sí mismo.
- [ ] El resto de las reglas de UML no se valida: puede haber varios nodos iniciales en un diagrama.
- [ ] Una decisión o una bifurcación pueden tener cualquier cantidad de flechas.

#### H16.4 - Poner una guarda a una flecha

**Como** dueño o editor, **quiero** escribir una condición sobre una flecha, **para** indicar cuándo
se toma cada camino de una decisión.

Criterios de aceptación:
- [ ] Una flecha puede tener una **guarda**: una condición opcional que se muestra entre corchetes
      sobre la flecha (por ejemplo, `[pago aprobado]`).
- [ ] La guarda está pensada para las flechas que salen de una decisión, pero se permite en cualquiera.
- [ ] Al mirar una versión cerrada se ven las guardas tal como estaban.
- [ ] Caso de error: si la guarda supera su longitud máxima (ver sección 3), no se guarda y se muestra
      el motivo.

### H17 - Carriles

#### H17.1 - Agregar un carril

**Como** dueño o editor, **quiero** dividir el lienzo de un diagrama en carriles con nombre, **para**
mostrar qué área o rol realiza cada parte del proceso.

Criterios de aceptación:
- [ ] La barra de herramientas del lienzo muestra la figura de un **carril** ("Carril" al pasar el
      mouse).
- [ ] Al hacer clic se agrega un carril con un nombre que no se repite en el diagrama ("Carril 1",
      "Carril 2"…).
- [ ] El carril nuevo queda pegado a la derecha del carril que está más a la derecha, o en el borde
      izquierdo del lienzo si no hay ninguno.
- [ ] Un carril se dibuja como una franja vertical que ocupa todo el alto del lienzo, con su nombre en
      la cabecera.
- [ ] Los carriles se dibujan detrás de los nodos y las flechas.
- [ ] Los nodos de control no tienen carriles, porque no tienen diagrama interno.
- [ ] Los carriles no aparecen en la barra lateral: solo en el lienzo de su diagrama.

#### H17.2 - Mover y cambiar el ancho de un carril

**Como** dueño o editor, **quiero** acomodar los carriles en el lienzo, **para** que cada uno abarque
los pasos que le corresponden.

Criterios de aceptación:
- [ ] El usuario mueve un carril hacia los costados arrastrando su cabecera (o con las flechas izquierda
      y derecha del teclado).
- [ ] El usuario ensancha o angosta un carril arrastrando cualquiera de sus dos bordes laterales.
- [ ] No hay un campo para escribir el ancho.
- [ ] Moverlo o cambiar su ancho no mueve ningún nodo.
- [ ] El carril guarda solo su posición y su ancho: no se registra qué nodos quedan dentro.
- [ ] Los nodos se ubican libremente, dentro o fuera de los carriles, y los carriles pueden
      superponerse; nada de eso se valida.
- [ ] Caso de error: el ancho no puede quedar fuera del mínimo y el máximo (ver sección 3).

#### H17.3 - Editar y eliminar un carril

**Como** dueño o editor, **quiero** renombrar o eliminar un carril, **para** mantener al día quién
hace cada parte del proceso.

Criterios de aceptación:
- [ ] Al elegir un carril (clic en su cabecera), el panel muestra su nombre para editarlo, la opción de
      eliminarlo y su historial de versiones.
- [ ] Eliminar un carril no elimina ni mueve los nodos que se ven sobre él.
- [ ] Los carriles se versionan como cualquier elemento y se guardan con "Confirmar cambios" (H12).
- [ ] Al mirar una versión cerrada se ven los carriles como estaban.
- [ ] Un carril pertenece a un diagrama y no cambia de diagrama.
- [ ] Eliminar la actividad cuyo diagrama divide elimina sus carriles en el mismo cambio (como a sus
      actividades internas).
- [ ] Mover de padre la actividad cuyo diagrama divide conserva sus carriles.
- [ ] Caso de error: si el nombre está vacío o supera la longitud máxima, no se guarda y se muestra el
      motivo.
- [ ] Caso de error: si el nombre ya lo usa otro carril vigente del mismo diagrama, no se guarda y se
      muestra el motivo. El nombre se compara igual que el título de una historia (sin distinguir
      mayúsculas ni espacios al borde).

## 5. Flujo principal

### Mapa de pantallas

La interfaz sigue el flujo principal y separa las rutas públicas de las que requieren sesión.
Los permisos se verifican siempre en el servidor; ocultar una acción en la UI no reemplaza la autorización.

| Pantalla | Ruta | Quién la ve | Propósito |
|---|---|---|---|
| Login | `/login` | Público | Iniciar sesión con Google. |
| Mis proyectos | `/proyectos` | Usuario autenticado | Listar únicamente proyectos con membresía aceptada y mostrar en cada uno el rol y si está en proceso o finalizado (H15), y crear un proyecto nuevo (H1): quien lo crea queda como Dueño. |
| Espacio del proyecto | `/proyectos/[id]` | Dueño, Editor o Lector aceptado del proyecto | Barra lateral con historias y diagramas (H11), panel con el elemento elegido (H3 a H7, H10), información del proyecto con su definición y sus entregables (H13, H14), selector de versión y cierre (H8, H9), y "Confirmar cambios" (H12). Dueño y Editor editan la documentación; solo el Dueño edita la definición y los entregables; el Lector solo consulta. |
| Versión cerrada | `/proyectos/[id]?build=<n>` | Dueño, Editor o Lector aceptado del proyecto | La misma pantalla en solo lectura, con la documentación del build `n` (H9). |
| Proyecto no encontrado | `/proyectos/[id]` | Usuario autenticado sin acceso o id inexistente | Mostrar el mismo 404 para no revelar si un proyecto ajeno existe. |
| Sistema visual | `/sistema` | Usuario autenticado | Revisar componentes, foco, contraste y estados sin modificar datos reales. |

La pantalla principal de proyectos contempla cinco estados distintos: **cargando**, **con datos**,
**vacío**, **sin resultados** y **error**. Vacío significa que la persona no tiene proyectos; sin
resultados significa que sí tiene proyectos pero el filtro actual no coincide con ninguno.

### El recorrido

El recorrido completo, paso a paso, del flujo que da valor al sistema (no un ABM).

1. El dueño crea un proyecto e invita colaboradores con rol editor o lector. Cada invitación queda
   pendiente hasta que el destinatario la acepta desde el correo recibido (ver H2 y sección 8).
2. El dueño define el proyecto (problema de negocio, objetivo, límites y fechas) y planifica los
   entregables con su fecha estimada (H13, H14).
3. Un editor registra historias de usuario con descripción y criterios de aceptación (H3).
4. El equipo crea diagramas, los llena de actividades, las conecta con flechas y las asocia a las
   historias que implementan (H5, H6, H10).
5. Si una actividad necesita más detalle, se abre su diagrama interno y se crean subactividades (H7).
6. Cada cambio confirmado crea una revisión nueva del elemento y conserva las anteriores (H4, H12).
7. Cuando la documentación de un entregable está lista, el dueño o un editor cierra la versión en
   desarrollo asignándole `Version.Build.Patch`, nombre y el entregable al que corresponde; el
   sistema abre automáticamente el build siguiente (H8).
8. Más adelante, cualquier colaborador elige esa versión cerrada en el selector y ve la documentación
   exactamente como estaba, diagramas incluidos (H9).
9. Cuando se entrega, el dueño marca el entregable como entregado con su fecha, y el equipo ve si se
   cumplió la fecha estimada (H14).
10. Cuando se terminó de documentar, el dueño finaliza el proyecto; si hace falta, puede reabrirlo
    (H15).

## 6. Reglas de negocio

Las restricciones que **no** son obvias y que la IA no puede adivinar. Estas son las que hay que
revisar a mano.

### Versionado

- Un elemento versionable nunca se sobrescribe: cada cambio confirmado crea una revisión nueva e
  inmutable. La versión del elemento aumenta de a uno.
- Cada revisión registra el build en el que se confirmó: la versión de proyecto en desarrollo en ese
  momento.
- **Reconstrucción de un build.** Para ver el build `n`, de cada elemento se toma **la última revisión
  confirmada en el build `n` o en uno anterior** (orden de los builds dentro del proyecto). Si esa
  revisión está marcada eliminado, el elemento no se muestra. Un elemento que nadie tocó durante el
  build `n` aparece igual, con la revisión que traía de antes.
- Las referencias (padre, origen, destino, historias asociadas) se interpretan en el mismo build que
  se está mirando. Una asociación a una historia que en ese build está eliminada no se muestra.
- El build en desarrollo muestra el estado actual: la última revisión de cada elemento.
- Confirmar un cambio que deja el elemento igual a su revisión vigente no crea una revisión.

### Borrador y concurrencia

- Las ediciones se acumulan en un borrador en el navegador. Solo "Confirmar cambios" escribe en la
  base, y crea una revisión por elemento modificado, en una sola transacción (todo o nada).
- Durante la confirmación se bloquea el build en desarrollo del proyecto hasta el final de la
  transacción. Así dos confirmaciones del mismo proyecto, o una confirmación y un cierre de versión,
  nunca se mezclan ni generan números de versión en conflicto.
- El borrador recuerda en qué versión estaba cada elemento cuando se empezó a editarlo. Si al confirmar
  algún elemento ya tiene una revisión más nueva confirmada por otro usuario, se rechaza toda la
  confirmación y se informa qué elementos tienen conflicto. No hay fusión automática.
- Al confirmar, todo elemento referenciado (padre, origen, destino, historia asociada) tiene que
  existir y no estar eliminado en el build en desarrollo. Si no, se rechaza la confirmación.
- La pantalla consulta periódicamente si otros confirmaron cambios. Sin borrador, se actualiza sola;
  con borrador, avisa (ver H12).

### Historias de usuario

- El título es único entre las historias vigentes (no eliminadas) del proyecto. No distingue
  mayúsculas/minúsculas ni espacios al borde, pero sí acentos y espacios internos. Se valida al crear
  y al editar.
- Una historia necesita título, descripción y al menos un criterio de aceptación.
- Eliminar una historia quita sus asociaciones con actividades desde ese build. Las actividades no se
  modifican: la asociación deja de mostrarse porque la historia está eliminada.

### Actividades y diagramas

- Una actividad sin padre es un diagrama: no tiene posición y no se conecta con flechas. Una actividad
  con padre tiene posición en el lienzo de su padre.
- Una actividad puede moverse a cualquier otra actividad del mismo proyecto, o a ninguna, salvo a sí
  misma o a una de sus actividades internas (en cualquier nivel). No hay límite de profundidad.
- Al mover una actividad de padre, sus flechas se eliminan en el mismo cambio.
- Eliminar una actividad elimina, en el mismo cambio, todas sus actividades internas (en todos los
  niveles) y todas las flechas que tocan a cualquiera de ellas.
- El nombre de una actividad puede repetirse.
- Un nodo es una actividad o un nodo de control (inicial, final de actividad, final de flujo,
  decisión, bifurcación). El tipo no cambia después de crearlo.
- Un nodo de control no tiene nombre, documentación, historias asociadas ni diagrama interno, y
  siempre tiene padre. No aparece en la barra lateral.
- Una actividad se puede asociar a varias historias; una historia, tener varias actividades
  asociadas. La asociación vive en la revisión de la actividad.

### Flechas

- Una flecha une dos actividades del mismo proyecto y del mismo diagrama (mismo padre, que no puede ser
  ninguno).
- Se permiten las flechas de una actividad hacia sí misma y los ciclos. Un nodo de control no puede
  tener una flecha hacia sí mismo.
- A un nodo inicial no le entran flechas; de un nodo final (de actividad o de flujo) no salen. El resto
  de las reglas de UML no se valida.
- Una flecha puede tener una guarda (condición opcional), que se muestra entre corchetes.
- No puede haber dos flechas vigentes con el mismo origen y el mismo destino.
- Una flecha se elimina sin eliminar las actividades que une.

### Carriles

- Un carril es solo visual: guarda su nombre, su posición X y su ancho. No se registra qué nodos están
  dentro, y ni su posición ni la de los nodos se validan entre sí (pueden quedar nodos fuera de los
  carriles y carriles superpuestos).
- Mover un carril, cambiar su ancho o eliminarlo no modifica ningún nodo.
- El nombre es obligatorio y único entre los carriles vigentes del mismo diagrama (se compara como el
  título de una historia). El ancho va de 120 a 2000.
- Un carril pertenece a un diagrama de tipo actividad (de cualquier nivel) y no cambia de diagrama.
  Eliminar esa actividad elimina sus carriles en el mismo cambio.

### Versiones de proyecto (builds)

- Un proyecto **en proceso** tiene siempre exactamente un build en desarrollo; se crea con el proyecto y
  se abre uno nuevo automáticamente cada vez que se cierra el anterior. Un proyecto **finalizado** no
  tiene build en desarrollo (H15).
- Finalizar cierra el build en desarrollo si tiene cambios (con las mismas reglas que cerrar una
  versión) o lo descarta si está vacío. Si no hay versiones cerradas ni cambios, no se puede finalizar.
- Reabrir abre un build en desarrollo nuevo, con el orden siguiente al último.
- El build en desarrollo no tiene número todavía. Al cerrarlo recibe `Version.Build.Patch` y queda
  inmutable: las revisiones que se confirmen después pertenecen al build siguiente.
- Cerrar una versión no copia documentación: el estado del build cerrado se obtiene con la regla de
  reconstrucción.
- Un build sin cambios confirmados no se puede cerrar.
- Una versión cerrada se identifica por `Version.Build.Patch` (enteros no negativos). `0.0.0` no es
  válida, no se repite dentro del proyecto, y cada cierre debe quedar por encima del anterior (orden
  `Version`, luego `Build`, luego `Patch`), aunque se pueden saltear números.
- Una versión cerrada no tiene autor y no se puede editar.
- Todo cierre se vincula a un entregable del mismo proyecto; sin entregables no se puede cerrar. El
  vínculo queda fijo como el resto de la versión cerrada.

### Permisos

- Dueño y Editor crean, modifican y eliminan historias, actividades y flechas, y cierran versiones.
- El Lector consulta la documentación actual, el historial de cada elemento y las versiones cerradas,
  pero no puede crear, editar ni eliminar.
- Solo el Dueño administra colaboradores y roles, edita la definición del proyecto, crea, edita,
  marca como entregados y elimina entregables, finaliza y reabre el proyecto, y lo elimina.
- En un proyecto finalizado nadie crea, modifica ni elimina documentación ni cierra versiones; el
  Dueño conserva lo demás.
- Todos los colaboradores ven la definición del proyecto y sus entregables.

### Colaboradores

- Un proyecto tiene exactamente un dueño: el que lo creó. El dueño no puede invitarse a sí mismo y
  tampoco puede dejar de colaborar (para eso elimina el proyecto). Los roles que el dueño puede asignar
  son solo editor y lector. No existe hoy una forma de transferir la titularidad (ver sección 9).
- Invitar a un colaborador crea una invitación con estado pendiente, aceptada o rechazada; solo con
  invitación aceptada tiene acceso al proyecto. La invitación se envía por correo y el destinatario la
  acepta o la rechaza desde los enlaces recibidos (ver H2 y sección 8).
- Un colaborador en estado aceptado es visible para cualquier colaborador del proyecto; uno en estado
  pendiente o rechazado solo es visible para el dueño.
- Solo se puede invitar a un usuario que ya tenga cuenta (ya haya iniciado sesión).
- Si se quita a un colaborador, pierde el acceso, pero las revisiones que escribió se conservan y lo
  siguen mostrando como autor.

### Proyecto

- Borrar un proyecto borra en cascada toda su documentación, incluidas las versiones cerradas: no
  queda nada recuperable. Por eso el sistema le avisa al dueño y le pide una segunda confirmación.
- No se implementan branches ni merges como Git; las revisiones son lineales.

### Definición del proyecto y entregables

- La definición del proyecto no se versiona ni pertenece a un build: guardarla reemplaza la anterior.
- La fecha estimada de fin del proyecto no puede ser anterior a la fecha de inicio.
- Un entregable tiene siempre fecha estimada de entrega. Si está entregado, tiene fecha de entrega,
  que no puede ser posterior a hoy (sí a la fecha estimada: queda "Entregado con atraso").
- **Estado de un entregable**, calculado con la fecha de hoy (hora de Argentina):

  | Estado | Cuándo |
  |---|---|
  | Pendiente | No entregado y hoy no pasó la fecha estimada |
  | Atrasado | No entregado y hoy ya pasó la fecha estimada |
  | Entregado a tiempo | Entregado con fecha de entrega igual o anterior a la estimada |
  | Entregado con atraso | Entregado con fecha de entrega posterior a la estimada |

- Un entregable puede tener varios builds cerrados; un build cerrado, un solo entregable.
- No se puede eliminar un entregable al que apunta algún build cerrado.
- Marcar un entregable como entregado no exige que tenga builds cerrados: el dueño decide qué
  significa entregarlo y puede explicarlo en la descripción.
## 7. Requisitos no funcionales

### Usabilidad

- **Eficiencia:** crear una actividad y conectarla con otra debe poder hacerse rapidamente desde el
  editor visual, sin cargar formularios largos.
- **Errores:** si falta un campo obligatorio, se senala el campo y no se pierde lo ya cargado.
- **Aprendizaje:** un integrante nuevo del equipo entiende donde crear historias, editar diagramas y
  consultar versiones de proyecto sin una explicacion externa.
- **Recuerdo:** el acceso al proyecto, su documentacion actual, el historial y las versiones de
  proyecto esta siempre disponible desde la navegacion principal.
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

**Cual:** email transaccional, con Resend (parte del nucleo obligatorio del MVP, no opcional).

**Por que Resend:** SDK simple, buena integracion con Next.js. El profesor no exige un proveedor
puntual (da como ejemplos Resend, Brevo, Mailgun); Resend fue nuestra eleccion.

> **Limitacion conocida del entorno de pruebas:** sin verificar un dominio propio en Resend, solo se
> puede enviar correos a la casilla con la que se creo la cuenta. Mientras no se verifique un
> dominio, la demostracion en produccion (y cualquier prueba manual) se hace enviando el correo a esa
> misma casilla, sea cual sea el destinatario real (colaborador invitado, quitado, etc.). El codigo
> no cambia el dia que se verifique un dominio: es una limitacion de la cuenta, no del modulo.

**Para que se usa — una fila por operacion, esencial o accesoria segun si esa operacion tiene
sentido aunque el correo nunca salga:**

| Operacion | Correo | Esencial / Accesoria | Si el mail falla | Que ve el usuario |
|---|---|---|---|---|
| Invitar a un colaborador (H2) | Invitacion con el rol ofrecido y un enlace para aceptar o rechazar | **Accesoria.** La invitacion queda creada en estado pendiente igual; el mail es hoy el unico canal para que el invitado se entere, pero eso no es una dependencia del sistema, es que no existe (todavia) otro canal | Se reintenta (ver mas abajo); si se agotan los reintentos, la invitacion sigue pendiente en la base y el dueño la ve en la lista de colaboradores | El dueño ve la invitacion como "pendiente" de todas formas. El invitado no ve nada hasta que el correo le llegue (o el dueño lo re-invite) |
| Quitar a un colaborador, o "No colaborar" (H2) | Correo de despedida | **Accesoria.** Quitar el acceso ya paso en la base cuando el mail se intenta enviar | Se reintenta; si falla del todo, se registra el error y no se revierte la baja | El colaborador pierde el acceso al instante, se entere o no por mail |
| Eliminar un proyecto (H1) | Aviso a los colaboradores | **Accesoria.** El proyecto ya esta borrado cuando el mail se intenta enviar | Se reintenta; si falla del todo, se registra el error y no se revierte el borrado | El dueño ve el proyecto eliminado al instante; los colaboradores pueden no enterarse si el mail no llega |

**No se envia correo:**
- Al cerrar una version de proyecto (H8): una version de proyecto no tiene autor y hoy no esta
  definido un correo para este evento.
- Al cambiar el rol de un colaborador (H2).
- Al rechazar una invitacion: no se le avisa al dueño (ver TODO de re-invitacion en H2).

**Idioma:** todos los correos se redactan en espanol.

**Timeout:** 5 segundos por intento. Ninguna llamada a Resend se hace sin timeout.

**Reintentos:** hasta 3 intentos por correo (el original + 2 reintentos), con una espera corta entre
cada uno. Si los 3 fallan, se registra el error en el log y la operacion que disparo el correo *no*
se revierte: ver la columna "Si el mail falla" de la tabla de arriba.

**Fuera de alcance por ahora:**
- Exportar versiones de proyecto o documentacion a PDF.
- Sincronizar archivos con un repositorio o almacenamiento externo.

## 9. Fuera de alcance

Lo que decidimos **no** hacer, o dejar para más adelante.

- **Branches y merges como Git.** El versionado es lineal por elemento.
- **Diff visual entre versiones.** Se pueden consultar revisiones y builds anteriores, pero no
  comparar automáticamente cambios campo por campo.
- **Restaurar un build completo, o editar documentación parado en una versión cerrada.** Una versión
  cerrada se consulta en modo lectura (ver H9).
- **Análisis y gestión de impactos al editar una versión vieja.** Requerimiento futuro: cuando se
  habilite editar parado en una versión anterior (por ejemplo, para corregir un entregable que el
  cliente rechazó), el sistema debería analizar si el cambio genera conflictos con los diagramas de
  versiones posteriores, notificarlo, y definir cómo propagar la corrección a esas versiones.
- **Fusión automática de cambios y edición colaborativa en tiempo real.** Dos usuarios pueden trabajar
  a la vez sobre el mismo proyecto, pero el sistema no combina sus cambios: si chocan, el segundo en
  confirmar recarga y rehace (ver H12).
- **Flechas con forma personalizable** (puntos intermedios, curvas o lado del nodo elegidos por el
  usuario, como en draw.io). Hoy una flecha se dibuja sola de borde a borde.
- **Diagramas de entidades.** Se podrían sumar como otro tipo de elemento versionable, con el mismo
  mecanismo que las actividades. Queda pendiente.
- **Contenido planificado de cada entregable y roles PO/PM.** Hoy un entregable tiene fechas y builds
  (H14), pero no se planifica qué historias tiene que incluir ni se controla que se cumplan. Tampoco
  hay un rol aparte para el PO o el PM: usan el rol Dueño.
- **Historial de la definición del proyecto.** Hoy guardarla reemplaza la anterior (H13).
- **Más datos de planificación del proyecto:** presupuesto, hitos, riesgos, alineación estratégica,
  ciclo de vida y prioridades de la triple restricción. Se evaluaron y quedaron afuera por ahora.
- **Transferir la titularidad de un proyecto a otro usuario.** Hoy un proyecto queda a nombre de quien
  lo creó, y solo se puede eliminar (ver sección 3).
- **Comentarios y aprobaciones.**
- **Notificaciones push.**
- **IA generando documentación o diagramas.**
- **Épicas.** Pueden agregarse después como agrupador de historias.
- **App nativa.** Es una aplicación web para escritorio y notebook, con soporte móvil básico.
