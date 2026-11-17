"use client";

/**
 * H5 / H6 / H7 / H10: una actividad abierta. Muestra la ruta desde el diagrama
 * raíz, su diagrama interno (el lienzo con sus actividades hijas y las flechas),
 * los datos de la actividad elegida en el lienzo, y los de la actividad abierta
 * con su historial.
 */
import { FormularioActividad } from "@/components/proyecto/FormularioActividad";
import { HistorialRevisiones } from "@/components/proyecto/HistorialRevisiones";
import { LienzoDiagrama, type FlechaLienzo, type NodoLienzo } from "@/components/proyecto/LienzoDiagrama";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Actividad } from "@/lib/documentacion";

type DatosFormulario = {
  actividad: Actividad;
  nueva: boolean;
  padresPosibles: { id: string; nombre: string; ruta: string }[];
};

export function PanelActividad({
  proyectoId,
  abierta,
  nodoElegido,
  ruta,
  soloLectura,
  mostrarErrores,
  historias,
  nodos,
  flechas,
  flechaResaltada,
  nombreDe,
  onIrA,
  onCambiar,
  onCambiarPadre,
  onEliminar,
  onSeleccionarNodo,
  onMoverNodo,
  onCrearNodo,
  onConectar,
  onEliminarFlecha,
}: {
  proyectoId: string;
  abierta: DatosFormulario;
  nodoElegido: DatosFormulario | null;
  ruta: { id: string; nombre: string }[];
  soloLectura: boolean;
  mostrarErrores: boolean;
  historias: { id: string; titulo: string }[];
  nodos: NodoLienzo[];
  flechas: FlechaLienzo[];
  flechaResaltada: string | null;
  nombreDe: (id: string) => string;
  onIrA: (id: string) => void;
  onCambiar: (id: string, cambio: Partial<Pick<Actividad, "nombre" | "documentacion" | "historiaIds">>) => void;
  onCambiarPadre: (id: string, padreId: string | null) => void;
  onEliminar: (id: string) => void;
  onSeleccionarNodo: (id: string | null) => void;
  onMoverNodo: (id: string, x: number, y: number) => void;
  onCrearNodo: (x: number, y: number) => void;
  onConectar: (origenId: string, destinoId: string) => void;
  onEliminarFlecha: (id: string) => void;
}) {
  const a = abierta.actividad;
  const esDiagrama = a.padreId === null;

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Ubicación en los diagramas">
        <ol className="flex flex-wrap items-center gap-1 text-sm">
          {ruta.map((paso, i) => (
            <li key={paso.id} className="flex items-center gap-1">
              {i > 0 && <span aria-hidden="true" className="text-muted-foreground">/</span>}
              {i < ruta.length - 1 ? (
                <button type="button" className="font-medium text-primary hover:underline" onClick={() => onIrA(paso.id)}>
                  {paso.nombre}
                </button>
              ) : (
                <span aria-current="page" className="font-semibold">
                  {paso.nombre}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-primary">{esDiagrama ? "Diagrama" : "Diagrama interno de la actividad"}</p>
              <CardTitle className="break-words text-2xl">{a.nombre || "Sin nombre"}</CardTitle>
            </div>
            <Badge variant="neutral">{abierta.nueva ? "Nueva, sin confirmar" : `Versión ${a.numeroVersion}`}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <LienzoDiagrama
            titulo={a.nombre}
            nodos={nodos}
            flechas={flechas}
            soloLectura={soloLectura}
            seleccionado={nodoElegido?.actividad.id ?? null}
            flechaResaltada={flechaResaltada}
            onSeleccionarNodo={onSeleccionarNodo}
            onAbrirNodo={onIrA}
            onMoverNodo={onMoverNodo}
            onCrearNodo={onCrearNodo}
            onConectar={onConectar}
            onEliminarFlecha={onEliminarFlecha}
          />
        </CardContent>
      </Card>

      {nodoElegido && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-primary">Actividad elegida en el diagrama</p>
                <CardTitle className="break-words">{nodoElegido.actividad.nombre || "Sin nombre"}</CardTitle>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="secondary" onClick={() => onIrA(nodoElegido.actividad.id)}>
                  Abrir su diagrama interno
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => onSeleccionarNodo(null)}>
                  Cerrar
                </Button>
              </div>
            </div>
            <CardDescription>
              {nodoElegido.nueva ? "Nueva, sin confirmar." : `Versión ${nodoElegido.actividad.numeroVersion}.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <FormularioActividad
              prefijo={`nodo-${nodoElegido.actividad.id}`}
              actividad={nodoElegido.actividad}
              soloLectura={soloLectura}
              mostrarErrores={mostrarErrores}
              historias={historias}
              padresPosibles={nodoElegido.padresPosibles}
              onCambiar={(cambio) => onCambiar(nodoElegido.actividad.id, cambio)}
              onCambiarPadre={(padreId) => onCambiarPadre(nodoElegido.actividad.id, padreId)}
              onEliminar={() => onEliminar(nodoElegido.actividad.id)}
            />
            {!nodoElegido.nueva && (
              <HistorialRevisiones
                key={nodoElegido.actividad.id}
                proyectoId={proyectoId}
                tipo="actividad"
                elementoId={nodoElegido.actividad.id}
                nombreDe={nombreDe}
              />
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Datos de {esDiagrama ? "este diagrama" : "esta actividad"}</CardTitle>
          {!soloLectura && (
            <CardDescription>Los cambios se guardan como una versión nueva al tocar “Confirmar cambios”.</CardDescription>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FormularioActividad
            prefijo={`abierta-${a.id}`}
            actividad={a}
            soloLectura={soloLectura}
            mostrarErrores={mostrarErrores}
            historias={historias}
            padresPosibles={abierta.padresPosibles}
            onCambiar={(cambio) => onCambiar(a.id, cambio)}
            onCambiarPadre={(padreId) => onCambiarPadre(a.id, padreId)}
            onEliminar={() => onEliminar(a.id)}
          />
          {!abierta.nueva && (
            <HistorialRevisiones key={a.id} proyectoId={proyectoId} tipo="actividad" elementoId={a.id} nombreDe={nombreDe} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
