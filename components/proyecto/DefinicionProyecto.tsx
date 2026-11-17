"use client";

/**
 * H13: la definición del proyecto. Todos los colaboradores la ven; el dueño la
 * edita y la guarda con su propio botón (no pasa por el borrador ni por
 * "Confirmar cambios": no pertenece a ningún build).
 *
 * El formulario valida con el mismo schema que el servidor; el PUT reemplaza
 * todos los campos.
 */
import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { definicionProyectoSchema, type DefinicionProyecto as Definicion } from "@/lib/schemas/proyecto";
import { formatearFecha } from "@/lib/utils";

const formatoCreado = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeZone: "America/Argentina/Buenos_Aires" });

type Errores = Partial<Record<keyof Definicion, string>>;

export function DefinicionProyecto({
  proyectoId,
  definicion,
  ownerNombre,
  creadoEn,
  puedeEditar,
  finalizado,
  onFinalizar,
  onReabrir,
}: {
  proyectoId: string;
  definicion: Definicion;
  ownerNombre: string;
  creadoEn: string;
  puedeEditar: boolean;
  // H15: el estado del proyecto; finalizar y reabrir los resuelve quien lo usa.
  finalizado: boolean;
  onFinalizar: () => void;
  onReabrir: () => void;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [datos, setDatos] = useState<Definicion>(definicion);
  const [errores, setErrores] = useState<Errores>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cambiar = (cambio: Partial<Definicion>) => setDatos((d) => ({ ...d, ...cambio }));

  const empezar = () => {
    setDatos(definicion);
    setErrores({});
    setErrorGeneral(null);
    setEditando(true);
  };

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    const resultado = definicionProyectoSchema.safeParse(datos);
    if (!resultado.success) {
      const campos = resultado.error.flatten().fieldErrors;
      setErrores(Object.fromEntries(Object.entries(campos).map(([k, v]) => [k, v?.[0]])) as Errores);
      return;
    }
    setErrores({});
    setErrorGeneral(null);
    setGuardando(true);
    try {
      const respuesta = await fetch(`/api/proyectos/${proyectoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resultado.data),
      });
      if (!respuesta.ok) {
        const cuerpo = await respuesta.json().catch(() => null);
        setErrorGeneral(cuerpo?.error ?? "No se pudo guardar. Probá de nuevo en unos segundos.");
        return;
      }
      setEditando(false);
      router.refresh();
    } catch {
      setErrorGeneral("Revisá tu conexión y probá de nuevo. Lo que escribiste sigue en el formulario.");
    } finally {
      setGuardando(false);
    }
  };

  const error = (campo: keyof Definicion) =>
    errores[campo] && (
      <p id={`definicion-${campo}-error`} className="mt-1 text-sm text-destructive">
        {errores[campo]}
      </p>
    );

  const describir = (campo: keyof Definicion) => ({
    "aria-invalid": errores[campo] ? true : undefined,
    "aria-describedby": errores[campo] ? `definicion-${campo}-error` : undefined,
  });

  if (editando) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Información del proyecto</CardTitle>
          <CardDescription>Solo vos, como dueño, podés editarla. No forma parte de ninguna versión.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={guardar} noValidate className="flex flex-col gap-4">
            {campo("definicion-nombre", "Nombre", <>
              <Input id="definicion-nombre" value={datos.nombre} onChange={(e) => cambiar({ nombre: e.target.value })} {...describir("nombre")} />
              {error("nombre")}
            </>)}
            {campo("definicion-descripcion", "Descripción", <>
              <Textarea id="definicion-descripcion" rows={2} value={datos.descripcion} onChange={(e) => cambiar({ descripcion: e.target.value })} {...describir("descripcion")} />
              {error("descripcion")}
            </>)}
            {campo("definicion-problemaNegocio", "Problema de negocio", <>
              <Textarea
                id="definicion-problemaNegocio"
                rows={4}
                placeholder="Qué problema u oportunidad origina el proyecto."
                value={datos.problemaNegocio}
                onChange={(e) => cambiar({ problemaNegocio: e.target.value })}
                {...describir("problemaNegocio")}
              />
              {error("problemaNegocio")}
            </>)}
            {campo("definicion-objetivo", "Objetivo del proyecto", <>
              <Textarea
                id="definicion-objetivo"
                rows={3}
                placeholder="Qué se busca lograr."
                value={datos.objetivo}
                onChange={(e) => cambiar({ objetivo: e.target.value })}
                {...describir("objetivo")}
              />
              {error("objetivo")}
            </>)}

            <fieldset {...describir("limitesExclusiones")}>
              <legend className="mb-2 text-sm font-medium">Límites y exclusiones</legend>
              {datos.limitesExclusiones.length === 0 && <p className="text-sm text-muted-foreground">Sin límites cargados.</p>}
              <ol className="flex flex-col gap-2">
                {datos.limitesExclusiones.map((limite, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <label htmlFor={`limite-${i}`} className="sr-only">
                      Límite o exclusión {i + 1}
                    </label>
                    <Input
                      id={`limite-${i}`}
                      value={limite}
                      onChange={(e) =>
                        cambiar({ limitesExclusiones: datos.limitesExclusiones.map((l, j) => (j === i ? e.target.value : l)) })
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Quitar el límite ${i + 1}`}
                      onClick={() => cambiar({ limitesExclusiones: datos.limitesExclusiones.filter((_, j) => j !== i) })}
                    >
                      Quitar
                    </Button>
                  </li>
                ))}
              </ol>
              {error("limitesExclusiones")}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => cambiar({ limitesExclusiones: [...datos.limitesExclusiones, ""] })}
              >
                Agregar límite o exclusión
              </Button>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              {campo("definicion-fechaInicio", "Fecha de inicio", <>
                <Input
                  id="definicion-fechaInicio"
                  type="date"
                  value={datos.fechaInicio ?? ""}
                  onChange={(e) => cambiar({ fechaInicio: e.target.value || null })}
                  {...describir("fechaInicio")}
                />
                {error("fechaInicio")}
              </>)}
              {campo("definicion-fechaFinEstimada", "Fecha estimada de fin", <>
                <Input
                  id="definicion-fechaFinEstimada"
                  type="date"
                  value={datos.fechaFinEstimada ?? ""}
                  onChange={(e) => cambiar({ fechaFinEstimada: e.target.value || null })}
                  {...describir("fechaFinEstimada")}
                />
                {error("fechaFinEstimada")}
              </>)}
            </div>

            {errorGeneral && (
              <Alert variant="error">
                <p className="font-semibold">No se pudo guardar la información del proyecto</p>
                <p className="mt-1">{errorGeneral}</p>
              </Alert>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditando(false)} disabled={guardando}>
                Cancelar
              </Button>
              <Button type="submit" disabled={guardando}>
                {guardando ? "Guardando…" : "Guardar información"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  const sinCompletar = <span className="font-normal text-muted-foreground">Sin completar</span>;
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>Información del proyecto</CardTitle>
            <Badge variant={finalizado ? "neutral" : "blue"}>{finalizado ? "Finalizado" : "En proceso"}</Badge>
          </div>
          <CardDescription>{definicion.descripcion || "Este proyecto todavía no tiene una descripción."}</CardDescription>
        </div>
        {puedeEditar && (
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={empezar}>
              Editar
            </Button>
            {/* H15: solo el dueño finaliza y reabre. */}
            <Button type="button" size="sm" variant="outline" onClick={finalizado ? onReabrir : onFinalizar}>
              {finalizado ? "Reabrir proyecto" : "Finalizar proyecto"}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          {dato("Propietario", false, <>{ownerNombre}</>)}
          {dato("Creado", false, <>{formatoCreado.format(new Date(creadoEn))}</>)}
          {dato("Fecha de inicio", false, <>{definicion.fechaInicio ? formatearFecha(definicion.fechaInicio) : sinCompletar}</>)}
          {dato("Fecha estimada de fin", false, <>
            {definicion.fechaFinEstimada ? formatearFecha(definicion.fechaFinEstimada) : sinCompletar}
          </>)}
          {dato("Problema de negocio", true, <>
            {definicion.problemaNegocio ? <span className="whitespace-pre-line font-normal">{definicion.problemaNegocio}</span> : sinCompletar}
          </>)}
          {dato("Objetivo del proyecto", true, <>
            {definicion.objetivo ? <span className="whitespace-pre-line font-normal">{definicion.objetivo}</span> : sinCompletar}
          </>)}
          {dato("Límites y exclusiones", true, <>
            {definicion.limitesExclusiones.length > 0 ? (
              <ul className="list-disc space-y-1 pl-5 font-normal">
                {definicion.limitesExclusiones.map((limite, i) => (
                  <li key={i}>{limite}</li>
                ))}
              </ul>
            ) : (
              sinCompletar
            )}
          </>)}
        </dl>
      </CardContent>
    </Card>
  );
}

// Funciones auxiliares (no componentes): una etiqueta con su campo, y un dato de la vista de lectura.
function campo(id: string, etiqueta: string, contenido: ReactNode) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium">
        {etiqueta}
      </label>
      {contenido}
    </div>
  );
}

function dato(titulo: string, ancho: boolean, contenido: ReactNode) {
  return (
    <div className={ancho ? "sm:col-span-2" : undefined}>
      <dt className="font-medium text-muted-foreground">{titulo}</dt>
      <dd className="mt-1 font-medium">{contenido}</dd>
    </div>
  );
}
