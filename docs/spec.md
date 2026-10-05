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
desarrollo** (donde se edita) que el equipo puede **cerrar** en cualquier momento, identificandola
con el formato `Version.Build.Patch` (por ejemplo `1.2.9`) como una entrega de la cursada; al
cerrarla, el sistema abre automaticamente la siguiente version en desarrollo.

> **Nota de terminologia:** este documento usaba antes el termino "Checkpoint" para este concepto.
> Se renombro a **"Version de proyecto"** para dejar mas claro que representa un hito con nombre del
> proyecto completo. No hay que confundirla con la "version" (numero entero simple, 1, 2, 3...) que
> ya tiene cada `HistoriaUsuario` o `Actividad` individual cada vez que se edita — son dos conceptos
> distintos que conviven en la UI.

## 2. Roles

| Rol | Quien es | Que puede hacer que el otro no |
|---|---|---|
| **Owner** | Creador o responsable del proyecto | Administrar miembros, cambiar roles, editar documentacion, crear versiones de proyecto y eliminar elementos |
| **Editor** | Integrante del equipo que trabaja sobre la documentacion | Crear y modificar historias, actividades, diagramas y versiones de proyecto |
| **Reader** | Docente, ayudante o integrante que solo consulta | Ver la documentacion actual, versiones anteriores y versiones de proyecto sin modificar nada |

Todos los roles tienen cuenta. La diferencia principal esta en los permisos dentro de cada proyecto,
no necesariamente en el tipo de usuario global.

## 3. Entidades

Los sustantivos que aparecen en las historias de usuario. De aca sale el modelo de datos.

| Entidad | Que representa | Se relaciona con |
|---|---|---|
| **Usuario** | Persona con cuenta en el sistema | MiembroProyecto (1-N), Proyecto (N-N a traves de MiembroProyecto), versiones creadas |
| **Proyecto** | Espacio de trabajo donde vive la documentacion | MiembroProyecto (1-N), HistoriaUsuario (1-N), Actividad (1-N), VersionProyecto (1-N) |
| **MiembroProyecto** | Relacion entre un usuario y un proyecto, con rol asignado | Usuario (N-1), Proyecto (N-1) |
| **HistoriaUsuario** | Identidad estable de una historia del proyecto; su titulo es unico dentro del proyecto | Proyecto (N-1), HistoriaUsuarioVersion (1-N), version actual |
| **HistoriaUsuarioVersion** | Revision inmutable de una historia de usuario | HistoriaUsuario (N-1), Usuario creador (N-1), VersionProyectoItem (1-N) |
| **Actividad** | Nodo estable del diagrama de actividades; puede tener una actividad padre | Proyecto (N-1), Actividad padre (N-1 opcional), ActividadVersion (1-N), conexiones |
| **ActividadVersion** | Revision inmutable de la documentacion de una actividad | Actividad (N-1), Usuario creador (N-1), VersionProyectoItem (1-N) |
| **ConexionActividad** | Flecha entre dos actividades del mismo diagrama | Actividad origen (N-1), Actividad destino (N-1), Proyecto (N-1) |
| **VersionProyecto** | Hito con nombre del proyecto (antes "Checkpoint"); tiene estado `en_desarrollo` (sin numero, es donde se edita, como maximo una por proyecto) o `cerrada` (identificada por `Version.Build.Patch`, captura el estado completo de la documentacion en ese momento) | Proyecto (N-1), Usuario creador (N-1), VersionProyectoItem (1-N si esta cerrada) |
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

**Reglas de borrado.** Que pasa en cada relacion cuando se borra el lado "padre":

| Si se borra... | Pasa con... | Regla |
|---|---|---|
| Usuario (no owner de ningun proyecto) | sus `MiembroProyecto` | se borran en cascada |
| Usuario que es owner de algun proyecto | ese `Proyecto` | **no se permite** borrar el usuario mientras siga siendo owner de un proyecto (hay que transferir el proyecto o borrarlo antes) |
| Usuario que escribio versiones (`autorId` en `HistoriaUsuarioVersion`, `ActividadVersion` o `VersionProyecto`) | esas versiones | **no se permite**: una version ya creada conserva su autor, no se puede borrar un usuario que firmo historial |
| Proyecto | sus `MiembroProyecto`, `HistoriaUsuario` (y sus versiones), `Actividad` (y sus versiones), `ConexionActividad`, `VersionProyecto` (incluidas las **cerradas**) | se borra todo en cascada, sin excepcion: borrar un proyecto borra tambien su historial de versiones cerradas, no hay forma de conservarlo aparte. Por eso, cuando se implemente el borrado de proyecto, la UI debe advertir explicitamente que se pierde todo (incluido el historial) y pedir una segunda confirmacion antes de ejecutar la accion. |
| HistoriaUsuario / Actividad | sus versiones (`HistoriaUsuarioVersion` / `ActividadVersion`) | se borran en cascada |
| Actividad padre | sus actividades hijas (diagramas anidados) | se borran en cascada |
| Actividad (origen o destino de una conexion) | esa `ConexionActividad` | se borra en cascada (borrar una actividad borra las flechas que la tocan; lo inverso no aplica, ver seccion 6) |
| HistoriaUsuarioVersion o ActividadVersion ya referenciada en una `VersionProyecto` cerrada (`VersionProyectoItem`) | esa referencia | **no se permite** borrar una version de historia/actividad mientras siga congelada en una version de proyecto cerrada: la version cerrada es una foto inmutable y no puede quedar con referencias rotas |
| VersionProyecto | sus `VersionProyectoItem` | se borran en cascada |

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
- [ ] Cuando el editor carga titulo, descripcion y criterios de aceptacion, entonces se crea la
      historia y se genera automaticamente su version 1.
- [ ] Dado que la historia fue creada, cuando se abre su detalle, entonces se muestran sus datos
      actuales y su historial de versiones.
- [ ] Caso de error: si falta titulo o descripcion, no se guarda y se muestran los campos a corregir.
- [ ] Caso de error: si el titulo ya existe en otra historia del mismo proyecto (sin distinguir
      mayusculas/minusculas ni espacios al borde), no se guarda y se muestra el motivo. El titulo
      identifica la historia para el equipo, asi que debe ser unico dentro del proyecto.

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

### H8 - Cerrar la version en desarrollo y numerarla

**Como** editor, **quiero** cerrar la version en desarrollo asignandole `Version.Build.Patch`,
**para** guardar el estado completo de la documentacion en un hito importante.

> Renombrada desde "Crear un checkpoint" (ver nota de terminologia en la seccion 1). Ya no se "crea"
> una version desde cero: el proyecto siempre tiene una version `en_desarrollo` abierta (se crea sola
> al entrar al proyecto por primera vez), y lo que hace el editor es **cerrarla**.

Criterios de aceptacion:
- [ ] El selector de version (arriba a la derecha, ver H9) siempre muestra una entrada "En desarrollo".
      Cuando el editor hace clic en ella, se abre el formulario para cerrarla.
- [ ] Cuando el editor abre el formulario de cierre, entonces el sistema pre-carga un
      `Version.Build.Patch` sugerido (mismo Version y Build que la ultima version cerrada del
      proyecto, con Patch+1; o `0.0.1` si todavia no cerro ninguna), editable antes de confirmar.
- [ ] Cuando el editor confirma `Version`, `Build`, `Patch`, nombre (opcional) y descripcion, entonces:
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

### H9 - Consultar una version de proyecto cerrada

**Como** reader, **quiero** consultar una version de proyecto anterior, **para** ver como estaba
documentado el proyecto en una entrega o hito especifico.

> Renombrada desde "Consultar un checkpoint" (ver nota de terminologia en la seccion 1).

Criterios de aceptacion:
- [ ] Dado que existe una version cerrada, cuando el usuario la abre, entonces ve su
      `Version.Build.Patch`, nombre (si tiene), descripcion, fecha de cierre, autor y el listado de
      historias y actividades incluidas con su contenido exacto.
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

1. El owner crea un proyecto y agrega integrantes con rol editor o reader.
2. Un editor registra historias de usuario con descripcion y criterios de aceptacion.
3. El equipo arma un diagrama visual creando actividades y conectandolas con flechas.
4. Si una actividad necesita mas detalle, el editor entra a su diagrama interno y crea
   subactividades.
5. Cada vez que se modifica una historia o actividad, el sistema crea una nueva version y conserva
   las anteriores.
6. Antes de una entrega, parcial o demo, el editor cierra la version en desarrollo asignandole
   `Version.Build.Patch` y nombre; el sistema abre automaticamente la siguiente version en desarrollo.
7. Mas adelante, cualquier miembro del proyecto puede elegir esa version cerrada desde el selector
   para reconstruir en modo lectura como estaba la documentacion en ese momento.

## 6. Reglas de negocio

Las restricciones que **no** son obvias y que la IA no puede adivinar. Estas son las que hay que
revisar a mano.

- Una historia o actividad nunca se sobrescribe: cada guardado crea una version nueva e inmutable.
- La entidad base (`HistoriaUsuario` o `Actividad`) apunta a una sola version actual.
- El numero de version aumenta de a uno dentro de cada historia o actividad.
- El titulo de una `HistoriaUsuario` es unico dentro de su proyecto (no distingue mayusculas/minusculas
  ni espacios al borde). No aplica a `Actividad`: su nombre puede repetirse.
- Un proyecto tiene siempre exactamente una version `en_desarrollo` (nunca cero, nunca mas de una); se
  crea automaticamente al entrar al proyecto por primera vez, y una nueva se crea automaticamente
  cada vez que se cierra la anterior.
- La version `en_desarrollo` es donde se edita: no tiene `Version.Build.Patch` todavia y sus
  historias/actividades "vigentes" son simplemente el estado actual del proyecto (no hay una foto
  guardada de ella hasta que se cierra).
- Cerrar una version no copia toda la documentacion: guarda referencias a las versiones vigentes de
  cada historia/actividad al momento del cierre, y recien ahi queda inmutable.
- Una version cerrada no cambia aunque despues se editen historias, actividades o diagramas bajo la
  nueva version en desarrollo.
- Una version cerrada se identifica por `Version.Build.Patch` (enteros no negativos). La combinacion
  `0.0.0` no es valida. No puede repetirse la combinacion dentro del mismo proyecto, y cada cierre
  nuevo debe quedar por encima de la ultima version cerrada existente (orden `Version`, luego
  `Build`, luego `Patch`), aunque se pueden saltear numeros.
- Solo owner y editor pueden crear o modificar documentacion.
- El reader puede consultar documentacion actual, versiones anteriores y versiones de proyecto, pero
  no puede crear, editar ni eliminar.
- Solo el owner puede administrar miembros y roles del proyecto.
- Una actividad puede tener una actividad padre para representar diagramas anidados.
- Una conexion solo puede unir actividades del mismo proyecto y del mismo nivel de diagrama.
- Una conexion se puede eliminar sin eliminar las actividades que conecta.
- Borrar un proyecto borra en cascada toda su documentacion, incluido el historial de versiones
  cerradas: no queda nada recuperable. Por eso esta accion (cuando se implemente) requiere que el
  sistema le avise al owner que va a perder todo y le pida confirmar la eliminacion una segunda vez
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

**Cual:** email transaccional (parte del nucleo obligatorio del MVP, no opcional).

**Para que se usa:**
- Notificar por mail a un usuario cuando el owner lo agrega como miembro de un proyecto (H2), con
  su rol asignado.
- Notificar por mail a los miembros del proyecto cuando se cierra una version de proyecto (H8), con
  su `Version.Build.Patch` y quien la cerro.

**Que pasa si el servicio de mail se cae:**
- La accion que dispara el mail (agregar un miembro, cerrar una version) se completa igual: el mail
  es una notificacion adicional, no una condicion para que la operacion principal funcione. Si el
  envio falla, se registra el error pero no se revierte la operacion.

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
- **Edicion colaborativa en tiempo real.** Dos usuarios no editan simultaneamente el mismo diagrama
  con sincronizacion instantanea.
- **Comentarios y aprobaciones.**
- **Notificaciones push.**
- **IA generando documentacion o diagramas.**
- **Epicas.** Pueden agregarse despues como agrupador de historias, pero no son imprescindibles para
  el MVP.
- **App nativa.** Es una aplicacion web y tiene que funcionar bien en escritorio y notebook; soporte
  movil basico si el equipo llega con tiempo.
