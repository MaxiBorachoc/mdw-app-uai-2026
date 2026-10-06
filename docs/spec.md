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

| Rol | Quien es | Que puede hacer que el otro no |
|---|---|---|
| **Dueño** | Creador y titular del proyecto | Administrar colaboradores, cambiar roles, editar documentacion, crear versiones de proyecto y eliminar elementos |
| **Editor** | Integrante del equipo que trabaja sobre la documentacion | Crear y modificar historias, actividades, diagramas y versiones de proyecto |
| **Lector** | Docente, ayudante o integrante que solo consulta | Ver la documentacion actual, versiones anteriores y versiones de proyecto sin modificar nada |

Todos los roles tienen cuenta. La diferencia principal esta en los permisos dentro de cada proyecto,
no necesariamente en el tipo de usuario global. Un proyecto tiene exactamente un dueño: quien lo
creo. El dueño aparece en la lista de colaboradores del proyecto con rol Dueño (ver seccion 4, H2).

## 3. Entidades

Los sustantivos que aparecen en las historias de usuario. De aca sale el modelo de datos.

| Entidad | Que representa | Se relaciona con |
|---|---|---|
| **Usuario** | Persona con cuenta en el sistema | MiembroProyecto (1-N), Proyecto (N-N a traves de MiembroProyecto), versiones creadas |
| **Proyecto** | Espacio de trabajo donde vive la documentacion | MiembroProyecto (1-N), HistoriaUsuario (1-N), Actividad (1-N), VersionProyecto (1-N) |
| **MiembroProyecto** | Relacion entre un usuario y un proyecto: rol asignado y estado de la invitacion (pendiente, aceptada o rechazada) | Usuario (N-1), Proyecto (N-1) |
| **HistoriaUsuario** | Identidad estable de una historia del proyecto; su titulo es unico dentro del proyecto | Proyecto (N-1), HistoriaUsuarioVersion (1-N), version actual |
| **HistoriaUsuarioVersion** | Revision inmutable de una historia de usuario; marca si esa revision la deja eliminada | HistoriaUsuario (N-1), Usuario creador (N-1), VersionProyectoItem (1-N) |
| **Actividad** | Nodo estable del diagrama de actividades; puede tener una actividad padre | Proyecto (N-1), Actividad padre (N-1 opcional), ActividadVersion (1-N), conexiones |
| **ActividadVersion** | Revision inmutable de la documentacion de una actividad; marca si esa revision la deja eliminada | Actividad (N-1), Usuario creador (N-1), VersionProyectoItem (1-N) |
| **ConexionActividad** | Flecha entre dos actividades del mismo diagrama | Actividad origen (N-1), Actividad destino (N-1), Proyecto (N-1) |
| **VersionProyecto** | Hito con nombre del proyecto (antes "Checkpoint"); tiene estado `en_desarrollo` (sin numero, es donde se edita, como maximo una por proyecto) o `cerrada` (identificada por `Version.Build.Patch`, captura el estado completo de la documentacion en ese momento); sin autor (ver nota mas abajo) | Proyecto (N-1), VersionProyectoItem (1-N si esta cerrada) |
| **VersionProyectoItem** | Referencia a la version exacta de una historia o actividad incluida en una version de proyecto cerrada | VersionProyecto (N-1), HistoriaUsuarioVersion o ActividadVersion |

**Relacion N-N:** un usuario participa en muchos proyectos y un proyecto tiene muchos usuarios, a
traves de `MiembroProyecto`.

**Versionado:** `HistoriaUsuario` y `Actividad` no se pisan. La entidad base conserva la identidad
del elemento y apunta a su version actual. Cada cambio crea una fila nueva en
`HistoriaUsuarioVersion` o `ActividadVersion`.

**Diagramas:** el diagrama se modela como nodos (`Actividad`) y flechas (`ConexionActividad`). Las
actividades anteriores y posteriores no se guardan como texto dentro de la actividad.

**`HistoriaUsuarioVersion` no tiene `prioridad` ni `estado`.** Se habian propuesto como campos, pero
el equipo decidio que no aportan valor al MVP; se pueden reincorporar en una version futura si hace
falta. Solo `ActividadVersion` tiene `estado` (valores: `pendiente`, `en_progreso`, `completada`).

**Eliminar una historia o una actividad no la borra de la base.** Crea una nueva version marcada
`eliminado` y la deja como version actual (es el mismo mecanismo de "cada cambio crea una fila
nueva", aplicado a un caso particular). Un elemento con `eliminado` en su version actual no aparece
en la version en desarrollo ni en ninguna version de proyecto que se cierre a partir de ese momento;
las versiones de proyecto cerradas *antes* de eliminarlo lo siguen mostrando tal como estaba, porque
la version que quedo congelada en ellas (`VersionProyectoItem`) no tiene `eliminado`. Solo el dueño
puede eliminar una historia o una actividad (ver seccion 2). Las conexiones no se versionan:
eliminarlas las borra de la base (ver seccion 6), consistente con que su estado en un momento
anterior ya no se conserva en las versiones de proyecto cerradas (deuda tecnica, ver seccion 6).

**`VersionProyecto` no tiene un "autor".** Una version de proyecto documenta el estado del proyecto
en un momento, no algo que una persona firma; por eso no se le atribuye autoria como a una
`HistoriaUsuarioVersion` o `ActividadVersion`. Quien la cerro no se muestra ni se comunica por mail.

**Longitudes maximas.** Segun estandares comunes:

| Campo | Longitud maxima |
|---|---|
| Nombre de proyecto | 100 caracteres |
| Descripcion de proyecto | 500 caracteres |
| Titulo de historia | 150 caracteres |
| Descripcion de historia | 2000 caracteres |
| Cada criterio de aceptacion | 300 caracteres |
| Nombre de actividad | 100 caracteres |
| Documentacion de actividad | 5000 caracteres |
| Nombre de version de proyecto | 100 caracteres |
| Descripcion de version de proyecto | 1000 caracteres |

**Reglas de borrado.** Que pasa en cada relacion cuando se borra el lado "padre":

| Si se borra... | Pasa con... | Regla |
|---|---|---|
| Usuario (no dueño de ningun proyecto) | sus `MiembroProyecto` | se borran en cascada |
| Usuario que es dueño de algun proyecto | ese `Proyecto` | **no se permite** borrar el usuario mientras siga siendo dueño de un proyecto (hay que eliminar esos proyectos antes; no existe una funcionalidad para transferir la titularidad de un proyecto a otro usuario — ver seccion 9) |
| Usuario que escribio versiones (`autorId` en `HistoriaUsuarioVersion` o `ActividadVersion`) | esas versiones | **no se permite**: una version ya creada conserva su autor, no se puede borrar un usuario que firmo historial. Si el usuario deja de ser colaborador del proyecto (lo quitan, o usa "No colaborar"), sus versiones anteriores lo siguen mostrando como autor igual |
| Proyecto | sus `MiembroProyecto`, `HistoriaUsuario` (y sus versiones), `Actividad` (y sus versiones), `ConexionActividad`, `VersionProyecto` (incluidas las **cerradas**) | se borra todo en cascada, sin excepcion: borrar un proyecto borra tambien su historial de versiones cerradas, no hay forma de conservarlo aparte. Por eso, cuando se implemente el borrado de proyecto, la UI debe advertir explicitamente que se pierde todo (incluido el historial) y pedir una segunda confirmacion antes de ejecutar la accion. |
| HistoriaUsuario / Actividad | sus versiones (`HistoriaUsuarioVersion` / `ActividadVersion`) | se borran en cascada (esto es borrado a nivel de base; el producto elimina una historia o actividad marcandola `eliminado`, no borrandola — ver mas arriba) |
| Actividad padre | sus actividades hijas (diagramas anidados) | se borran en cascada |
| Actividad (origen o destino de una conexion) | esa `ConexionActividad` | se borra en cascada (borrar una actividad borra las flechas que la tocan; lo inverso no aplica, ver seccion 6) |
| HistoriaUsuarioVersion o ActividadVersion ya referenciada en una `VersionProyecto` cerrada (`VersionProyectoItem`) | esa referencia | a nivel de base, **no se permite** borrarla: garantiza que una version cerrada nunca quede con una referencia rota. En la practica el producto nunca ejecuta ese borrado — "eliminar" una historia o actividad no borra sus versiones anteriores, crea una version nueva marcada `eliminado` (ver mas arriba) |
| VersionProyecto | sus `VersionProyectoItem` | se borran en cascada |

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

### H3 - Registrar una historia de usuario

**Como** editor, **quiero** cargar historias de usuario, **para** documentar que necesita el sistema
y con que criterios se valida.

Criterios de aceptacion:
- [ ] Cuando el editor carga titulo, descripcion y criterios de aceptacion, entonces se crea la
      historia y se genera automaticamente su version 1.
- [ ] Dado que la historia fue creada, cuando se abre su detalle, entonces se muestran sus datos
      actuales y su historial de versiones.
- [ ] Caso de error: si falta titulo o descripcion, no se guarda y se muestran los campos a corregir.
- [ ] Caso de error: si no se carga al menos un criterio de aceptacion, no se guarda.
- [ ] Caso de error: si el titulo ya existe en otra historia del mismo proyecto (sin distinguir
      mayusculas/minusculas ni espacios al borde, pero sin ignorar acentos ni espacios internos: esos
      si hacen que dos titulos se consideren distintos), no se guarda y se muestra el motivo. El
      titulo identifica la historia para el equipo, asi que debe ser unico dentro del proyecto.
- [ ] Caso de error: si el titulo, la descripcion o algun criterio de aceptacion superan la longitud
      maxima (ver seccion 3), no se guarda y se muestra el motivo.

> **Eliminar una historia:** ver la regla general en la seccion 3 ("Eliminar una historia o una
> actividad no la borra de la base") y quien puede hacerlo en la seccion 2.

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
- [ ] Caso de error: si el nuevo titulo ya existe en otra historia del mismo proyecto (misma regla
      que en H3), no se guarda y se muestra el motivo.
- [ ] Caso de error: si se guarda sin haber cambiado ningun campo, no se crea una version nueva y el
      sistema avisa que no hay cambios.
- [ ] Caso de error: si el titulo, la descripcion o algun criterio de aceptacion superan la longitud
      maxima (ver seccion 3), no se guarda y se muestra el motivo.

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
- [ ] Caso de error: si se intenta conectar dos actividades de distinto nivel de diagrama (una es
      hija de una actividad padre y la otra no, o son hijas de padres distintos), el sistema rechaza
      la accion (ver seccion 6).
- [ ] Caso de error: si ya existe una conexion con el mismo origen y el mismo destino, no se crea de
      nuevo.
- [ ] Caso de error: si el nombre de la actividad supera la longitud maxima (ver seccion 3), no se
      guarda y se muestra el motivo.

> **Propuesta (a confirmar):** para los siguientes dos casos no habia una regla escrita y no surgen
> directamente de una historia, asi que van como propuesta en vez de como decision tomada:
> - **Conectar una actividad consigo misma:** se rechaza (una flecha necesita dos nodos distintos).
> - **Ciclos, o conexiones en ambos sentidos entre el mismo par** (A→B y tambien B→A): se permiten,
>   porque un flujo real puede volver a un paso anterior; tecnicamente no chocan entre si porque
>   tienen distinto origen/destino cada una.

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
- [ ] Caso de error: si se guarda sin haber cambiado ningun campo, no se crea una version nueva y el
      sistema avisa que no hay cambios.
- [ ] Caso de error: si el nombre o la documentacion superan la longitud maxima (ver seccion 3), no
      se guarda y se muestra el motivo.

> **Eliminar una actividad:** ver la regla general en la seccion 3 y quien puede hacerlo en la
> seccion 2.

### H7 - Navegar diagramas anidados

**Como** editor, **quiero** abrir el detalle interno de una actividad, **para** descomponer una
actividad grande en subactividades mas especificas.

Criterios de aceptacion:
- [ ] Cuando el usuario hace doble clic sobre una actividad, entonces se abre su diagrama interno.
- [ ] Dado que se esta dentro de un diagrama interno, cuando el usuario crea una actividad, entonces
      queda asociada como hija de la actividad padre.
- [ ] Dado que el usuario esta en un subdiagrama, cuando vuelve atras, entonces regresa al diagrama
      padre conservando el contexto.

> **Propuesta (a confirmar):** dos casos que no surgen directamente de una historia:
> - **Mover una actividad a otro padre:** se permite, siempre que el nuevo padre sea del mismo
>   proyecto y no sea la propia actividad ni una de sus descendientes (evita un ciclo en la
>   jerarquia). Si la actividad tiene conexiones activas, hay que quitarlas antes de moverla, porque
>   al cambiar de nivel dejarian de cumplir la regla de "mismo nivel de diagrama" (ver H5). Este
>   detalle puede necesitar mas precision cuando se construya H7.
> - **Profundidad maxima de anidamiento:** sin limite tecnico; queda a criterio del equipo mantener
>   el diagrama legible.

### H8 - Cerrar la version en desarrollo y numerarla

**Como** dueño o editor, **quiero** cerrar la version en desarrollo asignandole `Version.Build.Patch`,
**para** guardar el estado completo de la documentacion en un hito importante.

> Renombrada desde "Crear un checkpoint" (ver nota de terminologia en la seccion 1). Ya no se "crea"
> una version desde cero: el proyecto siempre tiene una version `en_desarrollo` abierta (se crea junto
> con el proyecto), y lo que hace quien cierra es **cerrarla**.

Criterios de aceptacion:
- [ ] El selector de version (arriba a la derecha, ver H9) siempre muestra una entrada "En desarrollo".
      Cuando se hace clic en ella, se abre el formulario para cerrarla.
- [ ] Cuando se abre el formulario de cierre, entonces el sistema pre-carga un `Version.Build.Patch`
      sugerido (mismo Version y Build que la ultima version cerrada del proyecto, con Patch+1; o
      `0.0.1` si todavia no se cerro ninguna), editable antes de confirmar.
- [ ] Cuando se confirma `Version`, `Build`, `Patch` y opcionalmente nombre y descripcion, entonces:
      (a) la version en desarrollo pasa a estado `cerrada` con esos datos y guarda una referencia a la
      version actual de cada historia y actividad del proyecto (en todos los niveles de diagramas
      anidados); y (b) el sistema abre automaticamente una nueva version `en_desarrollo` para que el
      equipo siga trabajando.
- [ ] Todo lo que se creo o edito mientras una version estaba en desarrollo queda referenciado por
      ella al cerrarla, aunque se lo siga editando despues bajo la version nueva (cada version cerrada
      es una foto completa e inmutable del proyecto en ese instante, no un diff).
- [ ] Caso de error: `Version`, `Build` y `Patch` deben ser numeros enteros no negativos. La
      combinacion `0.0.0` no es valida (si `Version` y `Build` son 0, `Patch` debe ser mayor a 0).
- [ ] Caso de error: no puede existir mas de una version cerrada del mismo proyecto con la misma
      combinacion exacta de `Version.Build.Patch`.
- [ ] Caso de error: la version a cerrar debe quedar por encima de la ultima version cerrada del
      proyecto, comparando en orden `Version`, luego `Build`, luego `Patch` (por ejemplo, `1.2.9` es
      anterior a `1.3.0`, y `2.9.5` es posterior a ambas pero anterior a `3.1.3`). Se puede saltear
      numeros (ir del build 2 al 5 sin pasar por el 3 o el 4), pero no retroceder.
- [ ] Caso de error: si la version en desarrollo no tiene cambios (no se creo, edito ni elimino
      ninguna historia o actividad desde que se abrio), no se puede cerrar; el sistema avisa que no
      hay cambios. Esto evita, entre otras cosas, que dos cierres simultaneos dejen una version cerrada
      vacia: el segundo encuentra la version recien abierta por el primero, sin cambios, y no puede
      cerrarla.

### H9 - Consultar una version de proyecto cerrada

**Como** lector, **quiero** consultar una version de proyecto anterior, **para** ver como estaba
documentado el proyecto en una entrega o hito especifico.

> Renombrada desde "Consultar un checkpoint" (ver nota de terminologia en la seccion 1).

Criterios de aceptacion:
- [ ] Dado que existe una version cerrada, cuando el usuario la abre, entonces ve su
      `Version.Build.Patch`, nombre (si tiene), descripcion, fecha de cierre y el listado de
      historias y actividades incluidas con su contenido exacto (una version de proyecto no tiene
      autor propio, ver seccion 3).
- [ ] El proyecto tiene un selector de version visible en toda la pantalla (arriba a la derecha): por
      defecto muestra "En desarrollo" (la version donde se esta editando ahora); al elegir una version
      cerrada del listado, la etiqueta pasa a mostrar su `Version.Build.Patch`.
- [ ] Cuando el usuario elige una version cerrada desde el selector, entonces toda la pantalla pasa a
      modo **solo lectura** mostrando la documentacion tal como estaba en esa version; para volver a
      editar, el usuario usa el boton "Volver a la version actual".
- [ ] Dado que el usuario no pertenece al proyecto, cuando intenta abrir una version, entonces el
      sistema rechaza el acceso.

> **Fuera de alcance por ahora:** editar documentacion estando parado en una version cerrada (no solo
> consultarla). Ver seccion 9.

## 5. Flujo principal

El recorrido completo, paso a paso, del flujo que da valor al sistema (no un ABM).

1. El dueño crea un proyecto e invita colaboradores con rol editor o lector. Cada invitacion queda pendiente hasta que el destinatario la acepta desde el correo    recibido (ver H2 y seccion 8).
2. Un editor registra historias de usuario con descripcion y criterios de aceptacion.
3. El equipo arma un diagrama visual creando actividades y conectandolas con flechas.
4. Si una actividad necesita mas detalle, el editor entra a su diagrama interno y crea
   subactividades.
5. Cada vez que se modifica una historia o actividad, el sistema crea una nueva version y conserva
   las anteriores.
6. Antes de una entrega, parcial o demo, el dueño o un editor cierra la version en desarrollo
   asignandole `Version.Build.Patch` y nombre; el sistema abre automaticamente la siguiente version
   en desarrollo.
7. Mas adelante, cualquier colaborador del proyecto puede elegir esa version cerrada desde el
   selector para reconstruir en modo lectura como estaba la documentacion en ese momento.

## 6. Reglas de negocio

Las restricciones que **no** son obvias y que la IA no puede adivinar. Estas son las que hay que
revisar a mano.

- Una historia o actividad nunca se sobrescribe: cada guardado crea una version nueva e inmutable.
- La entidad base (`HistoriaUsuario` o `Actividad`) apunta a una sola version actual.
- El numero de version aumenta de a uno dentro de cada historia o actividad.
- Las escrituras que crean una nueva version de una historia o actividad bloquean el registro
  correspondiente durante toda la transaccion contra la base (se libera al confirmar o revertir);
  esto evita que dos ediciones simultaneas sobre el mismo elemento generen numeros de version en
  conflicto.
- Guardar una historia o actividad sin cambios no crea una version nueva.
- El titulo de una `HistoriaUsuario` es unico dentro de su proyecto (no distingue mayusculas/minusculas
  ni espacios al borde, pero si distingue acentos y espacios internos). Se valida tanto al crear (H3)
  como al editar (H4). No aplica a `Actividad`: su nombre puede repetirse.
- Eliminar una historia o una actividad no la borra: crea una nueva version marcada `eliminado`, deja
  de aparecer en la version en desarrollo y en las versiones de proyecto que se cierren desde ese
  momento, pero sigue visible en las versiones de proyecto cerradas anteriores (ver seccion 3). Solo
  el dueño puede hacerlo.
- Un proyecto tiene siempre exactamente una version `en_desarrollo` (nunca cero, nunca mas de una); se
  crea automaticamente al crear el proyecto, y una nueva se crea automaticamente cada vez que se
  cierra la anterior.
- La version `en_desarrollo` es donde se edita: no tiene `Version.Build.Patch` todavia y sus
  historias/actividades "vigentes" son simplemente el estado actual del proyecto (no hay una foto
  guardada de ella hasta que se cierra).
- Una version en desarrollo sin cambios (nada creado, editado ni eliminado desde que se abrio) no se
  puede cerrar.
- Cerrar una version no copia toda la documentacion: guarda referencias a las versiones vigentes de
  cada historia/actividad al momento del cierre, y recien ahi queda inmutable.
- Una version cerrada no cambia aunque despues se editen historias, actividades o diagramas bajo la
  nueva version en desarrollo. Una version cerrada no tiene autor (ver seccion 3).
- Una version cerrada se identifica por `Version.Build.Patch` (enteros no negativos). La combinacion
  `0.0.0` no es valida. No puede repetirse la combinacion dentro del mismo proyecto, y cada cierre
  nuevo debe quedar por encima de la ultima version cerrada existente (orden `Version`, luego
  `Build`, luego `Patch`), aunque se pueden saltear numeros.
- Solo el dueño y los editores pueden crear o modificar documentacion. Eliminar una historia o
  actividad es exclusivo del dueño (ver mas arriba).
- El lector puede consultar documentacion actual, versiones anteriores y versiones de proyecto, pero
  no puede crear, editar ni eliminar.
- Solo el dueño puede administrar colaboradores y roles del proyecto.
- Un proyecto tiene exactamente un dueño: el que lo creo. El dueño no puede invitarse a si mismo como
  colaborador de su propio proyecto y tampoco puede dejar de colaborar con el (para eso elimina el
  proyecto). Los roles que el dueño puede asignar a un colaborador son solo editor y lector. No existe
  hoy una forma de transferir la titularidad de un proyecto a otro usuario (ver seccion 9).
- Invitar a un colaborador crea una invitacion con estado pendiente, aceptada o rechazada; solo con
  invitacion aceptada tiene acceso al proyecto. La invitacion se envia por correo y el destinatario debe aceptarla o rechazarla desde los enlaces recibidos (ver H2 y seccion 8).
- Un colaborador en estado aceptado es visible para cualquier colaborador del proyecto; uno en
  estado pendiente o rechazado solo es visible para el dueño.
- Solo se puede invitar a un usuario que ya tenga cuenta (ya haya iniciado sesion).
- Si se quita a un colaborador del proyecto, pierde el acceso, pero las versiones de historias o
  actividades que escribio se conservan y lo siguen mostrando como autor.
- Una actividad puede tener una actividad padre para representar diagramas anidados.
- Una conexion solo puede unir actividades del mismo proyecto y del mismo nivel de diagrama.
- Una conexion se puede eliminar sin eliminar las actividades que conecta. A diferencia de historias y
  actividades, una conexion eliminada se borra de la base (no se versiona).
- Borrar un proyecto borra en cascada toda su documentacion, incluido el historial de versiones
  cerradas: no queda nada recuperable. Por eso esta accion (cuando se implemente) requiere que el
  sistema le avise al dueño que va a perder todo y le pida confirmar la eliminacion una segunda vez
  antes de ejecutarla. Ver detalle completo de reglas de borrado por entidad en la seccion 3.
- Para reconstruir correctamente una version de proyecto, tambien se deberia conservar el estado de
  las conexiones y posiciones del diagrama correspondientes a ese momento; **hoy no se conserva**
  (una version de proyecto solo referencia el contenido documental de historias/actividades, no el
  layout ni las conexiones del diagrama en ese instante). Queda como deuda tecnica conocida.
- No se implementan branches ni merges como Git; el sistema usa revisiones lineales inspiradas en
  Git.

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

Lo que decidimos **no** hacer.

- **Branches y merges como Git.** El versionado es lineal por historia y por actividad.
- **Diff visual entre versiones.** Se podran consultar versiones anteriores, pero no comparar
  automaticamente cambios campo por campo.
- **Restaurar una version de proyecto completa, o editar documentacion parado en una version
  anterior.** El MVP permite consultarla en modo lectura desde el selector de version (ver H9), no
  volver todo el proyecto a ese estado ni modificarlo desde ahi.
- **Analisis y gestion de impactos al editar una version vieja.** Requerimiento futuro: cuando se
  habilite editar documentacion parado en una version anterior, el sistema deberia analizar si el
  cambio genera conflictos con los diagramas de actividades documentados en versiones posteriores, y
  notificar al usuario si los hay. No entra en el MVP.
- **Transferir la titularidad de un proyecto a otro usuario.** Podria agregarse en el futuro; hoy un
  proyecto queda a nombre de quien lo creo para siempre, y solo se puede eliminar (ver seccion 3).
- **Edicion colaborativa en tiempo real.** Dos usuarios no editan simultaneamente el mismo diagrama
  con sincronizacion instantanea.
- **Comentarios y aprobaciones.**
- **Notificaciones push.**
- **IA generando documentacion o diagramas.**
- **Epicas.** Pueden agregarse despues como agrupador de historias, pero no son imprescindibles para
  el MVP.
- **App nativa.** Es una aplicacion web y tiene que funcionar bien en escritorio y notebook; soporte
  movil basico si el equipo llega con tiempo.
