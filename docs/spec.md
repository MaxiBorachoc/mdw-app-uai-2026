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
| **Dueño** | Creador y titular del proyecto. En la práctica suele ser el PO o el PM | Todo lo que hace un Editor, y además administrar colaboradores y roles, y editar o eliminar el proyecto |
| **Editor** | Integrante que trabaja sobre la documentación: analista funcional, arquitecto, desarrollador | Crear, modificar y eliminar historias de usuario, actividades y flechas, y cerrar versiones de proyecto |
| **Lector** | Docente, ayudante o integrante que solo consulta | Ver la documentación actual, el historial de cada elemento y las versiones de proyecto cerradas, sin modificar nada |

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
| `ActividadVersion` | Nombre, documentación, actividad padre (o ninguna), posición X e Y en el lienzo, e historias de usuario asociadas |
| `ConexionActividadVersion` | Actividad de origen y actividad de destino |

**Las referencias apuntan al `id` del elemento, no a una versión.** El padre de una actividad, el
origen y el destino de una flecha y las historias asociadas a una actividad guardan el `id` del
elemento referido. Qué versión de ese elemento corresponde se resuelve con la regla de
reconstrucción de un build (sección 6), así que editar un elemento no obliga a crear revisiones de los
que lo referencian.

### Todas las entidades

| Entidad | Qué representa | Se relaciona con |
|---|---|---|
| **Usuario** | Persona con cuenta en el sistema | MiembroProyecto (1-N), Proyecto (N-N a través de MiembroProyecto), revisiones que escribió |
| **Proyecto** | Espacio de trabajo donde vive la documentación | MiembroProyecto (1-N), elementos versionables (1-N), VersionProyecto (1-N) |
| **MiembroProyecto** | Relación entre un usuario y un proyecto: rol asignado y estado de la invitación (pendiente, aceptada o rechazada) | Usuario (N-1), Proyecto (N-1) |
| **HistoriaUsuario** / **HistoriaUsuarioVersion** | Identidad y revisiones de una historia de usuario. El título es único dentro del proyecto | Proyecto (N-1), actividades que la referencian |
| **Actividad** / **ActividadVersion** | Identidad y revisiones de una actividad. Una actividad **sin padre** es un **diagrama**; las que tienen padre son los nodos de su diagrama interno | Proyecto (N-1), actividad padre (N-1 opcional), historias asociadas (N-N), flechas |
| **ConexionActividad** / **ConexionActividadVersion** | Identidad y revisiones de una flecha entre dos actividades del mismo diagrama | Actividad origen (N-1), actividad destino (N-1), Proyecto (N-1) |
| **VersionProyecto** | Un **build** del proyecto. Está `en_desarrollo` (sin número, es donde se trabaja; siempre hay exactamente una por proyecto) o `cerrada` (identificada por `Version.Build.Patch`). Tiene un número de orden correlativo dentro del proyecto (1, 2, 3...) que ordena los builds. No tiene autor | Proyecto (N-1), revisiones confirmadas durante ese build (1-N) |

**Relaciones N-N:** un usuario participa en muchos proyectos y un proyecto tiene muchos usuarios, a
través de `MiembroProyecto`. Una actividad puede asociarse a varias historias y una historia tener
varias actividades asociadas; la asociación se guarda en cada revisión de la actividad.

**Diagramas:** un diagrama es una actividad sin padre. Sus actividades hijas son los nodos de su
lienzo, y las flechas unen hijas del mismo padre. Una actividad hija puede tener a su vez hijas: ese es
su diagrama interno (diagramas anidados). Un proyecto puede tener todos los diagramas que el equipo
necesite.

**Asociación con historias de usuario:** se define desde la actividad (cualquier actividad, de
cualquier nivel), no desde la historia. La historia muestra la lista de actividades asociadas,
calculada a partir de las actividades que la referencian en el build que se está mirando.

**Eliminar no borra.** Eliminar una historia, una actividad o una flecha crea una revisión nueva
marcada **eliminado**. Desde ese build el elemento deja de aparecer; los builds anteriores lo siguen
mostrando tal como estaba, porque su revisión vigente en ellos no está marcada como eliminada.

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
| Cada criterio de aceptación | 300 caracteres |
| Nombre de actividad | 100 caracteres |
| Documentación de actividad | 5000 caracteres |
| Nombre de versión de proyecto | 100 caracteres |
| Descripción de versión de proyecto | 1000 caracteres |

**Reglas de borrado en la base.** El producto nunca borra elementos versionables (los marca como
eliminados). Estas reglas aplican cuando se borra un registro de la base:

| Si se borra... | Pasa con... | Regla |
|---|---|---|
| Usuario (no dueño de ningún proyecto) | sus `MiembroProyecto` | se borran en cascada |
| Usuario que es dueño de algún proyecto | ese `Proyecto` | **no se permite** borrar el usuario mientras siga siendo dueño de un proyecto (no existe una funcionalidad para transferir la titularidad, ver sección 9) |
| Usuario que escribió revisiones | esas revisiones | **no se permite**: una revisión conserva su autor. Si el usuario deja de ser colaborador, sus revisiones lo siguen mostrando como autor |
| Proyecto | sus colaboradores, sus elementos versionables con todas sus revisiones y sus `VersionProyecto` (incluidas las **cerradas**) | se borra todo en cascada, sin excepción. Por eso la UI advierte que se pierde todo (incluido el historial) y pide una segunda confirmación |
| Identidad de un elemento | sus revisiones | se borran en cascada (solo ocurre al borrar el proyecto) |
| Actividad referenciada como padre, origen o destino, o historia referenciada desde una actividad | la revisión que la referencia | **no se permite**: una revisión nunca queda con una referencia rota |
| `VersionProyecto` con revisiones confirmadas en ese build | esas revisiones | **no se permite** |

## 4. Historias de usuario

Formato: **Como** <rol>, **quiero** <accion>, **para** <beneficio>.
Cada historia lleva su criterio de aceptacion: como se verifica que esta terminada.

> **Todas las historias asumen que el usuario inicio sesion y pertenece al proyecto indicado**,
> salvo que se indique lo contrario.

### H1 - Crear un proyecto

**Como** dueño, **quiero** crear un proyecto, **para** tener un espacio donde centralizar la
documentacion del equipo.

Criterios de aceptacion:
- [ ] Cuando el usuario carga nombre y descripcion del proyecto, entonces el proyecto queda creado
      y el usuario queda asociado como dueño.
- [ ] Dado que el dueño entra a su listado de proyectos, cuando se muestra la pantalla, entonces ve
      el proyecto creado.
- [ ] Los nombres de proyecto pueden repetirse entre proyectos distintos: no hace falta que sean
      unicos.
- [ ] Caso de error: si el nombre esta vacio, no se guarda y se muestra el motivo.
- [ ] Caso de error: si el nombre o la descripcion superan la longitud maxima (ver seccion 3), no se
      guarda y se muestra el motivo.
- [ ] Cuando el dueño edita nombre o descripcion del proyecto, entonces los cambios quedan guardados.
      Ningun otro rol puede editarlos.
- [ ] Caso de error: si quien intenta editar el proyecto no es su dueño, el sistema rechaza la accion
      aunque la llamada no venga de la interfaz.
- [ ] Cuando el dueño elimina el proyecto, entonces el sistema le advierte que se va a perder toda la
      documentacion (incluidas las versiones cerradas, ver regla de borrado en la seccion 3) y le pide
      confirmar la eliminacion una segunda vez antes de ejecutarla. Ningun otro rol puede eliminarlo.
      Al eliminarlo, los colaboradores del proyecto reciben un correo electronico avisandoles (ver
      seccion 8).
- [ ] Caso de error: si quien intenta eliminar el proyecto no es su dueño, el sistema rechaza la
      accion aunque la llamada no venga de la interfaz.

### H2 - Administrar colaboradores del proyecto

**Como** dueño, **quiero** invitar colaboradores y asignarles un rol, **para** controlar quien puede
editar o solo consultar la documentacion.

> En la interfaz, la cabecera del proyecto tiene un boton **"Colaboradores"** que abre una ventana
> emergente. Arriba hay un cuadro de texto donde el dueño escribe el email de un usuario y, con cada
> `Enter`, lo agrega a la lista de abajo. Desde esa lista elige el rol de cada uno (**Editor** o
> **Lector**). Cada proyecto tiene su propia lista de colaboradores, con su estado de invitacion
> (pendiente, aceptada o rechazada). En la pantalla de inicio cada usuario ve los proyectos en los
> que participa.

> **Estado actual vs. objetivo.** El modelo de estados (pendiente / aceptada / rechazada) y todo lo
> que depende de un correo de por medio -enviar la invitacion, que el usuario la acepte o la
> rechace desde ahi, re-invitar, el aviso al dueño- queda especificado aca para cuando se integre el
> servicio de mail (clase 7). Hasta entonces, agregar un colaborador lo deja directamente en estado
> **aceptada** (se presume aceptada, sin pasar por pendiente ni por un correo).

Criterios de aceptacion:
- [ ] Cuando el dueño ingresa el email de un usuario existente y le asigna rol editor o lector,
      entonces se crea una invitacion con ese rol y aparece en la lista de colaboradores del dueño.
      *(Objetivo, clase 7):* queda en estado **pendiente** y el usuario invitado recibe un correo
      electronico con la invitacion (ver seccion 8). *(Hoy):* queda directamente en estado
      **aceptada**, sin enviar ningun correo.
- [ ] Mientras la invitacion este pendiente, el usuario invitado no tiene acceso al proyecto (no
      cuenta como colaborador a los efectos de los permisos). *(No aplica hoy: no hay estado
      pendiente todavia, ver mas arriba.)*
- [ ] *(Objetivo, clase 7)* Cuando el usuario invitado acepta la invitacion desde el correo, entonces
      su estado pasa a **aceptada** y a partir de ese momento tiene acceso al proyecto con el rol
      asignado.
- [ ] *(Objetivo, clase 7)* Cuando el usuario invitado rechaza la invitacion desde el correo,
      entonces su estado pasa a **rechazada** y no tiene acceso al proyecto. No se le avisa al dueño
      de este rechazo (a definir si hace falta un aviso, ver TODO mas abajo).
- [ ] En la lista de colaboradores, los que estan en estado **aceptada** son visibles para
      cualquier colaborador del proyecto (cualquier rol). Los que estan en estado **pendiente** o
      **rechazada** solo son visibles para el dueño.
- [ ] Cuando el dueño cambia el rol de un colaborador con invitacion aceptada entre editor y lector,
      entonces el cambio queda guardado. No se envia correo por este cambio.
- [ ] Cuando el dueño quita a un colaborador de la lista (con invitacion aceptada, pendiente o
      rechazada), entonces pierde -o no llega a tener- acceso al proyecto, y recibe un correo
      electronico de despedida (ver seccion 8).
- [ ] Dado que un colaborador tiene rol lector, cuando intenta crear o modificar documentacion,
      entonces el sistema rechaza la accion.
- [ ] Dado que un usuario es colaborador (con invitacion aceptada) de un proyecto ajeno, entonces ve
      un boton **"No colaborar"** dentro del cuadro de ese proyecto, a la derecha; no lo ve en sus
      propios proyectos ni en los que no es colaborador. Cuando lo usa, deja de ser colaborador,
      pierde el acceso al proyecto y el dueño recibe un correo electronico avisando que dejo de
      colaborar (ver seccion 8).
- [ ] Caso de error: si el email ingresado no corresponde a ningun usuario, no se agrega y se marca
      la caja en rojo con el mensaje "Se ingresó un usuario inexistente"; el dueño es notificado de
      que el usuario que quiere invitar no existe.
- [ ] Caso de error: si el dueño ingresa su propio email, no se agrega: el dueño ya es titular del
      proyecto y no puede figurar como invitado.
- [ ] Caso de error: si el dueño ingresa dos o mas veces el mismo usuario, no se agrega de nuevo a la
      lista.
- [ ] Caso de error: si quien intenta invitar, quitar o cambiar roles no es el dueño, el sistema
      responde 403 aunque la llamada no venga de la interfaz.
- [ ] *(Objetivo, clase 7)* El dueño puede volver a invitar a un usuario cuya invitacion anterior
      esta en estado **rechazada**: se comporta como una invitacion nueva (vuelve a **pendiente**,
      se reenvia el correo).

> No hay un maximo de colaboradores por proyecto.
>
> **Implementado en la clase 7:** el circuito completo de invitacion por correo (enviarla, que el
> usuario invitado la acepte o la rechace desde ahi, y que el dueño pueda re-invitar a quien
> rechazo). Ver `lib/servicios/mail.ts` y los endpoints `.../aceptar` y `.../rechazar` en
> `docs/api.md`.
>
> **Mejoras futuras, no pedidas por ninguna clase y no implementadas:** un limite contra el spam de
> invitaciones repetidas (cuantas veces o cada cuanto se puede re-invitar al mismo usuario), y avisarle
> al dueño cuando un usuario rechaza su invitacion (hoy no se le avisa).

> **Cómo se guarda cualquier cambio de H3 a H11:** las ediciones se acumulan en un **borrador** y
> recién se registran al tocar **"Confirmar cambios"** (ver H12). Cuando un criterio dice "se crea",
> "se guarda" o "se elimina", quiere decir: al confirmar.

### H3 - Registrar una historia de usuario

**Como** dueño o editor, **quiero** cargar historias de usuario, **para** documentar qué necesita el
sistema y con qué criterios se valida.

Criterios de aceptación:
- [ ] Desde la barra lateral (ver H11), en el acordeón "Historias de usuario", el usuario elige "Nueva
      historia" y carga título, descripción y criterios de aceptación (uno o más).
- [ ] Al confirmar, la historia queda creada con su versión 1, registrada en el build en desarrollo.
- [ ] Caso de error: si falta título o descripción, no se puede confirmar y se marcan los campos a
      corregir.
- [ ] Caso de error: si no hay al menos un criterio de aceptación, no se puede confirmar.
- [ ] Caso de error: si el título ya existe en otra historia vigente del mismo proyecto (sin distinguir
      mayúsculas/minúsculas ni espacios al borde, pero sin ignorar acentos ni espacios internos), no
      se guarda y se muestra el motivo. El título identifica la historia para el equipo.
- [ ] Caso de error: si el título, la descripción o algún criterio superan la longitud máxima (ver
      sección 3), no se guarda y se muestra el motivo.

### H4 - Editar, consultar y eliminar una historia sin perder versiones anteriores

**Como** dueño o editor, **quiero** modificar o eliminar una historia de usuario, **para** mantener
la documentación al día sin perder cómo estaba antes.

Criterios de aceptación:
- [ ] Cuando se confirma un cambio en una historia, el sistema crea una revisión nueva (versión del
      elemento + 1) en el build en desarrollo.
- [ ] El detalle de la historia muestra sus datos y su **historial**: versión del elemento, build,
      fecha, autor y contenido de cada revisión. Abrir una revisión anterior la muestra en modo
      lectura, sin modificar la actual.
- [ ] El detalle de la historia muestra la **lista de actividades asociadas**: las actividades que la
      referencian en el build que se está mirando (ver H6). Desde la lista se puede ir a cada una.
- [ ] Cuando el usuario elimina una historia, el sistema le pide confirmación. Al confirmar, se crea
      una revisión marcada eliminado: desde ese build la historia no aparece y las actividades que la
      tenían asociada dejan de mostrarla.
- [ ] Caso de error: si el nuevo título ya existe en otra historia vigente (misma regla que en H3), no
      se guarda y se muestra el motivo.
- [ ] Caso de error: si los datos quedan iguales a la revisión vigente, no se crea una revisión nueva.
- [ ] Caso de error: si algún campo supera la longitud máxima, no se guarda y se muestra el motivo.

### H5 - Crear diagramas de actividades

**Como** dueño o editor, **quiero** crear todos los diagramas que necesite el proyecto, **para**
representar cada proceso funcional por separado.

Criterios de aceptación:
- [ ] Desde la barra lateral, en el acordeón "Diagramas de actividades", el usuario elige "Nuevo diagrama" y carga un
      nombre. El diagrama es una actividad sin padre: tiene nombre, documentación e historias
      asociadas como cualquier actividad (ver H6), pero no tiene posición porque no se dibuja en ningún
      lienzo.
- [ ] Un proyecto puede tener cualquier cantidad de diagramas. La barra lateral los lista a todos.
- [ ] Al abrir un diagrama se ve su lienzo, con las actividades hijas y las flechas entre ellas.
- [ ] Caso de error: si el nombre está vacío o supera la longitud máxima, no se guarda y se muestra el
      motivo.

### H6 - Crear, documentar, mover y eliminar actividades

**Como** dueño o editor, **quiero** armar el contenido de un diagrama con actividades, **para**
describir los pasos de un proceso y conservar cómo estaba en cada build.

Criterios de aceptación:
- [ ] Dentro del lienzo de un diagrama, el usuario crea una actividad: aparece como un nodo con su
      nombre y queda como hija del diagrama abierto.
- [ ] El usuario edita el nombre y la documentación de una actividad.
- [ ] El usuario asocia una actividad (de cualquier nivel, incluido un diagrama) a una o más historias
      de usuario vigentes del proyecto, y puede quitar asociaciones.
- [ ] El usuario mueve una actividad dentro del lienzo arrastrándola, o con el teclado. Al confirmar,
      la posición final queda guardada en una revisión nueva: al volver al diagrama, y al mirar ese
      build más adelante, la actividad está en el mismo lugar. Arrastrarla varias veces antes de
      confirmar genera una sola revisión.
- [ ] Cada cambio confirmado (nombre, documentación, posición, padre o historias asociadas) crea una
      revisión nueva de la actividad, con el mismo historial que una historia (ver H4).
- [ ] Cuando el usuario elimina una actividad, el sistema le avisa que también se eliminan sus
      actividades internas (y las internas de esas, en todos los niveles) y las flechas que tocan a
      cualquiera de ellas, y le pide confirmación. Al confirmar, todas quedan marcadas eliminado en el
      build en desarrollo.
- [ ] Caso de error: si el nombre está vacío o el nombre o la documentación superan la longitud
      máxima, no se guarda y se muestra el motivo.
- [ ] Caso de error: si los datos quedan iguales a la revisión vigente, no se crea una revisión nueva.

### H7 - Navegar diagramas anidados y mover actividades de padre

**Como** dueño o editor, **quiero** abrir el diagrama interno de una actividad, **para** descomponer
una actividad grande en subactividades.

Criterios de aceptación:
- [ ] Cuando el usuario hace doble clic sobre una actividad (o la selecciona y presiona `Enter`), se
      abre su diagrama interno.
- [ ] Dentro del diagrama interno, las actividades que se crean quedan como hijas de esa actividad.
- [ ] Una ruta de navegación ("migas de pan") muestra en qué nivel está el usuario y le permite volver
      a cualquier nivel superior conservando el contexto.
- [ ] El usuario puede mover una actividad a otro padre: a cualquier otra actividad del mismo proyecto,
      o a ninguna (pasa a ser un diagrama). No hay límite de profundidad.
- [ ] Si la actividad que se mueve tiene flechas, el sistema avisa que se van a quitar (una flecha solo
      une actividades del mismo diagrama) y las elimina en el mismo cambio.
- [ ] Caso de error: no se puede mover una actividad a sí misma ni a una de sus actividades internas
      (en cualquier nivel): crearía una contención circular.

### H8 - Cerrar la versión en desarrollo y numerarla

**Como** dueño o editor, **quiero** cerrar la versión en desarrollo asignándole `Version.Build.Patch`,
**para** dejar registrado el estado completo de la documentación en un hito.

Criterios de aceptación:
- [ ] El selector de versión (arriba a la derecha, ver H9) siempre muestra una entrada "En desarrollo"
      y la opción de cerrarla.
- [ ] El formulario de cierre propone un `Version.Build.Patch` (mismo Version y Build que la última
      versión cerrada, con Patch + 1; o `0.0.1` si no se cerró ninguna), editable antes de confirmar,
      y un nombre y una descripción opcionales.
- [ ] Al confirmar, el build en desarrollo pasa a `cerrada` con esos datos y el sistema abre
      automáticamente el build en desarrollo siguiente. No se copia ninguna documentación: el estado
      del build cerrado queda definido por las revisiones confirmadas hasta ese momento (ver la regla
      de reconstrucción en la sección 6).
- [ ] Si el usuario tiene cambios sin confirmar, el sistema le pide confirmarlos o descartarlos antes
      de cerrar la versión.
- [ ] Caso de error: `Version`, `Build` y `Patch` deben ser enteros no negativos; `0.0.0` no es válida.
- [ ] Caso de error: no puede haber dos versiones cerradas del mismo proyecto con la misma combinación.
- [ ] Caso de error: la versión a cerrar debe quedar por encima de la última cerrada (orden `Version`,
      luego `Build`, luego `Patch`). Se pueden saltear números, pero no retroceder.
- [ ] Caso de error: si en el build en desarrollo no se confirmó ningún cambio (crear, modificar,
      mover, conectar o eliminar cualquier elemento), no se puede cerrar y el sistema avisa que no hay
      cambios.

### H9 - Consultar una versión de proyecto cerrada

**Como** cualquier colaborador, **quiero** ver el proyecto tal como estaba en una versión cerrada,
**para** saber qué se entregó en un hito.

Criterios de aceptación:
- [ ] El proyecto tiene un selector de versión arriba a la derecha. Por defecto muestra "En
      desarrollo"; al elegir una versión cerrada, la etiqueta muestra su `Version.Build.Patch`.
- [ ] Al elegir una versión cerrada, toda la pantalla pasa a **solo lectura** y muestra la
      documentación exactamente como estaba al cerrarla: las historias con su contenido, los diagramas
      con sus actividades **en las mismas posiciones**, la misma jerarquía de diagramas anidados, las
      mismas flechas y las mismas asociaciones con historias.
- [ ] Se ve el número, el nombre, la descripción y la fecha de cierre de la versión.
- [ ] Un botón "Volver a la versión actual" regresa al build en desarrollo.
- [ ] Caso de error: si el usuario no pertenece al proyecto, el sistema rechaza el acceso.

### H10 - Conectar actividades con flechas

**Como** dueño o editor, **quiero** unir actividades con flechas, **para** representar el orden y las
repeticiones de un proceso.

Criterios de aceptación:
- [ ] Dentro de un lienzo, el usuario crea una flecha eligiendo una actividad de origen y una de
      destino. La flecha se dibuja sola, de borde a borde de los nodos.
- [ ] Se permite una flecha de una actividad hacia sí misma, y se permiten ciclos (A → B → A), para
      modelar procesos repetitivos.
- [ ] El usuario elimina una flecha sin eliminar las actividades que une.
- [ ] Las flechas se versionan como cualquier elemento: al mirar un build cerrado se ven las flechas
      que existían en ese momento.
- [ ] Caso de error: si ya existe una flecha con el mismo origen y destino, no se crea otra; el
      sistema resalta la existente.
- [ ] Caso de error: no se puede unir actividades de distinto diagrama (de distinto padre) ni de otro
      proyecto. Los diagramas (actividades sin padre) no se conectan con flechas.

### H11 - Navegar los elementos del proyecto desde una barra lateral

**Como** colaborador, **quiero** ver todos los elementos del proyecto en un solo lugar, **para**
llegar rápido a lo que necesito.

Criterios de aceptación:
- [ ] La pantalla del proyecto tiene una barra lateral a la izquierda con "Información del proyecto"
      y un acordeón por tipo de elemento versionable: "Historias de usuario" y "Diagramas de
      actividades".
- [ ] Solo un acordeón está abierto a la vez: abrir uno cierra el otro. El acordeón abierto ocupa el
      alto que dejan libre los demás dentro de la barra; si su contenido no entra, se desplaza dentro
      del acordeón (la barra no crece hasta el infinito).
- [ ] El acordeón "Diagramas de actividades" muestra un árbol: cada diagrama con sus actividades, y
      cada actividad con sus actividades internas, en todos los niveles.
- [ ] Cada elemento del árbol que tiene actividades internas se puede desplegar y plegar. Al entrar,
      los niveles arrancan plegados, salvo el camino hasta el elemento que se está viendo.
- [ ] Seleccionar un elemento en la barra abre su detalle en el panel principal.
- [ ] La barra respeta el build que se está mirando: en una versión cerrada muestra los elementos de
      ese momento.
- [ ] En pantallas angostas (375 px), la barra se muestra arriba del contenido.

### H12 - Confirmar cambios y trabajar en simultáneo

**Como** dueño o editor, **quiero** confirmar mis cambios de una sola vez y enterarme de lo que
hicieron los demás, **para** no generar versiones por cada gesto ni pisar el trabajo de otro.

Criterios de aceptación:
- [ ] Las ediciones (crear, modificar, mover, conectar, asociar o eliminar) se acumulan en un borrador
      que vive en el navegador y no tocan la base.
- [ ] El botón **"Confirmar cambios"** está siempre visible. Está gris y deshabilitado si no hay
      cambios, y toma el color de acción cuando hay cambios pendientes. No muestra la cantidad.
- [ ] Un botón "Descartar cambios" vuelve al estado confirmado. Si el usuario intenta salir con cambios
      sin confirmar, el sistema le avisa.
- [ ] Al confirmar, se crea **una revisión por elemento modificado** (no una por gesto), todas en una
      sola operación: o se guardan todas, o ninguna.
- [ ] Si otro usuario confirma cambios, quien **no** tiene borrador ve la pantalla actualizada sola.
- [ ] Si otro usuario confirma cambios y el usuario **sí** tiene borrador, su pantalla no se recarga.
      Aparece un botón en la cabecera, junto al selector de versión, que abre una ventana con los
      cambios agrupados por usuario, por ejemplo: "Cambios realizados por Juan: Se modificó Actividad
      Facturación". Un cambio en una flecha se informa como un cambio en la actividad cuyo diagrama la
      contiene.
- [ ] Si otro usuario confirmó cambios sobre un elemento que el usuario actual tiene modificado en su
      borrador, el botón "Confirmar cambios" se pone **amarillo**: avisa que la confirmación va a ser
      rechazada.
- [ ] Caso de error: al confirmar, si otro usuario ya confirmó una revisión más nueva de algún elemento
      del borrador, o eliminó un elemento al que el borrador hace referencia, el sistema rechaza toda la
      confirmación, dice qué elementos tienen conflicto y ofrece recargarlos. No hay fusión automática.

> **Lector:** ve la misma pantalla en modo lectura, sin borrador ni botones de edición.

## 5. Flujo principal

### Mapa de pantallas

La interfaz sigue el flujo principal y separa las rutas públicas de las que requieren sesión.
Los permisos se verifican siempre en el servidor; ocultar una acción en la UI no reemplaza la autorización.

| Pantalla | Ruta | Quién la ve | Propósito |
|---|---|---|---|
| Login | `/login` | Público | Iniciar sesión con Google. |
| Mis proyectos | `/proyectos` | Usuario autenticado | Listar únicamente proyectos con membresía aceptada y mostrar el rol en cada uno, y crear un proyecto nuevo (H1): quien lo crea queda como Dueño. |
| Espacio del proyecto | `/proyectos/[id]` | Dueño, Editor o Lector aceptado del proyecto | Barra lateral con historias y diagramas (H11), panel con el elemento elegido (H3 a H7, H10), selector de versión y cierre (H8, H9), y "Confirmar cambios" (H12). Dueño y Editor editan; el Lector solo consulta. |
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
2. Un editor registra historias de usuario con descripción y criterios de aceptación (H3).
3. El equipo crea diagramas, los llena de actividades, las conecta con flechas y las asocia a las
   historias que implementan (H5, H6, H10).
4. Si una actividad necesita más detalle, se abre su diagrama interno y se crean subactividades (H7).
5. Cada cambio confirmado crea una revisión nueva del elemento y conserva las anteriores (H4, H12).
6. Antes de una entrega, parcial o demo, el dueño o un editor cierra la versión en desarrollo
   asignándole `Version.Build.Patch` y nombre; el sistema abre automáticamente el build siguiente (H8).
7. Más adelante, cualquier colaborador elige esa versión cerrada en el selector y ve la documentación
   exactamente como estaba, diagramas incluidos (H9).

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
- Una actividad se puede asociar a varias historias; una historia, tener varias actividades
  asociadas. La asociación vive en la revisión de la actividad.

### Flechas

- Una flecha une dos actividades del mismo proyecto y del mismo diagrama (mismo padre, que no puede ser
  ninguno).
- Se permiten las flechas de una actividad hacia sí misma y los ciclos.
- No puede haber dos flechas vigentes con el mismo origen y el mismo destino.
- Una flecha se elimina sin eliminar las actividades que une.

### Versiones de proyecto (builds)

- Un proyecto tiene siempre exactamente un build en desarrollo; se crea con el proyecto y se abre uno
  nuevo automáticamente cada vez que se cierra el anterior.
- El build en desarrollo no tiene número todavía. Al cerrarlo recibe `Version.Build.Patch` y queda
  inmutable: las revisiones que se confirmen después pertenecen al build siguiente.
- Cerrar una versión no copia documentación: el estado del build cerrado se obtiene con la regla de
  reconstrucción.
- Un build sin cambios confirmados no se puede cerrar.
- Una versión cerrada se identifica por `Version.Build.Patch` (enteros no negativos). `0.0.0` no es
  válida, no se repite dentro del proyecto, y cada cierre debe quedar por encima del anterior (orden
  `Version`, luego `Build`, luego `Patch`), aunque se pueden saltear números.
- Una versión cerrada no tiene autor y no se puede editar.

### Permisos

- Dueño y Editor crean, modifican y eliminan historias, actividades y flechas, y cierran versiones.
- El Lector consulta la documentación actual, el historial de cada elemento y las versiones cerradas,
  pero no puede crear, editar ni eliminar.
- Solo el Dueño administra colaboradores y roles, y edita o elimina el proyecto.

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
  habilite editar parado en una versión anterior, el sistema debería analizar si el cambio genera
  conflictos con los diagramas de versiones posteriores y notificarlo.
- **Fusión automática de cambios y edición colaborativa en tiempo real.** Dos usuarios pueden trabajar
  a la vez sobre el mismo proyecto, pero el sistema no combina sus cambios: si chocan, el segundo en
  confirmar recarga y rehace (ver H12).
- **Flechas con forma personalizable** (puntos intermedios, curvas o lado del nodo elegidos por el
  usuario, como en draw.io). Hoy una flecha se dibuja sola de borde a borde.
- **Diagramas de entidades.** Se podrían sumar como otro tipo de elemento versionable, con el mismo
  mecanismo que las actividades. Queda pendiente.
- **Entregables por versión y roles PO/PM.** A definir: planificar qué historias o entregables debe
  incluir una versión antes de cerrarla y que el PO o el PM controlen su cumplimiento. Hoy una versión
  es la foto de todo lo documentado al cerrarla, y el PO o PM usan el rol Dueño.
- **Transferir la titularidad de un proyecto a otro usuario.** Hoy un proyecto queda a nombre de quien
  lo creó, y solo se puede eliminar (ver sección 3).
- **Comentarios y aprobaciones.**
- **Notificaciones push.**
- **IA generando documentación o diagramas.**
- **Épicas.** Pueden agregarse después como agrupador de historias.
- **App nativa.** Es una aplicación web para escritorio y notebook, con soporte móvil básico.
