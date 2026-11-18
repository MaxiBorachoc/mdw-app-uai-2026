/**
 * El espacio de trabajo de un proyecto (docs/spec.md, sección 5).
 *
 * Server Component: verifica la sesión y la membresía, y lee de lib/db el
 * proyecto, sus builds y la documentación del build pedido (?build=n, o el build
 * en desarrollo). El borrador y la edición viven en EspacioProyecto (cliente).
 * Un proyecto ajeno, uno inexistente y un build que no existe dan el mismo 404.
 */
import { notFound } from "next/navigation";
import { Navegacion } from "@/components/Navegacion";
import { EspacioProyecto } from "@/components/proyecto/EspacioProyecto";
import type { BuildResumen } from "@/components/proyecto/BarraProyecto";
import { requerirUsuario } from "@/lib/auth";
import { ahoraEnLaBase, cargarEstado, listarBuilds } from "@/lib/db/documentacion";
import { listarEntregables } from "@/lib/db/entregables";
import { obtenerProyectoParaVista } from "@/lib/db/vistas-proyectos";
import { vigentes } from "@/lib/documentacion";
import { ordenBuildSchema } from "@/lib/schemas/cambios";
import { hoyEnArgentina } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Contexto = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ build?: string | string[] }>;
};

export default async function ProyectoPage({ params, searchParams }: Contexto) {
  const usuario = await requerirUsuario();
  const { id } = await params;
  const { build } = await searchParams;

  const proyecto = await obtenerProyectoParaVista(id, usuario.id);
  if (!proyecto) notFound();
  const membresia = proyecto.miembros.find((m) => m.usuario.id === usuario.id);
  if (!membresia) notFound();

  const builds = await listarBuilds(id);
  const resumen = builds.map(
    (b): BuildResumen => ({
      orden: b.orden,
      estado: b.estado,
      etiqueta: b.estado === "CERRADA" ? `${b.numeroVersion}.${b.numeroBuild}.${b.numeroPatch}` : "En desarrollo",
      nombre: b.nombre,
      descripcion: b.descripcion,
      cerradaEl: b.cerradaEl?.toISOString() ?? null,
      entregable: b.entregable?.nombre ?? null,
      tieneCambios:
        b._count.historiaRevisiones + b._count.actividadRevisiones + b._count.conexionRevisiones + b._count.carrilRevisiones > 0,
    }),
  );

  let visto = resumen.find((b) => b.estado === "EN_DESARROLLO") ?? resumen[0];
  if (build !== undefined) {
    const orden = ordenBuildSchema.safeParse(Array.isArray(build) ? build[0] : build);
    visto = orden.success ? resumen.find((b) => b.orden === orden.data) : undefined;
  }
  if (!visto) notFound();

  const [estado, desde, entregables] = await Promise.all([
    cargarEstado(id, visto.estado === "CERRADA" ? visto.orden : null),
    ahoraEnLaBase(),
    listarEntregables(id),
  ]);

  return (
    <>
      <Navegacion usuario={usuario} rol={membresia.rol} />
      <EspacioProyecto
        // Cambiar de build arma el espacio de cero (otro borrador, otra selección).
        // El build en desarrollo usa siempre la misma clave: al cerrar una versión se
        // abre otro, y la selección y lo que se estaba mirando se conservan.
        key={visto.estado === "EN_DESARROLLO" ? "en-desarrollo" : visto.orden}
        proyecto={{
          id: proyecto.id,
          ownerNombre: proyecto.owner.nombre,
          creadoEn: proyecto.creadoEn.toISOString(),
          definicion: {
            nombre: proyecto.nombre,
            descripcion: proyecto.descripcion,
            problemaNegocio: proyecto.problemaNegocio,
            objetivo: proyecto.objetivo,
            limitesExclusiones: proyecto.limitesExclusiones,
            fechaInicio: proyecto.fechaInicio,
            fechaFinEstimada: proyecto.fechaFinEstimada,
          },
        }}
        miembros={proyecto.miembros.map((m) => ({ id: m.usuario.id, nombre: m.usuario.nombre, email: m.usuario.email, rol: m.rol }))}
        rol={membresia.rol}
        builds={resumen}
        buildVisto={visto}
        estado={vigentes(estado)}
        desde={desde.toISOString()}
        entregables={entregables}
        hoy={hoyEnArgentina()}
        finalizado={proyecto.estado === "FINALIZADO"}
        vistaActual={build === undefined || visto.estado === "EN_DESARROLLO"}
      />
    </>
  );
}
