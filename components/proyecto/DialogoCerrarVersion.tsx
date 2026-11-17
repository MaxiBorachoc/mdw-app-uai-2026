"use client";

/**
 * H8: el formulario para cerrar la versión en desarrollo. Propone un número
 * (Patch + 1 de la última cerrada, o 0.0.1) que se puede editar. La forma se
 * valida con el mismo schema que el servidor; las reglas que dependen de las
 * otras versiones (no repetir, no retroceder, que haya cambios) las decide el
 * servidor y el mensaje se muestra acá.
 *
 * Todo cierre corresponde a un entregable (obligatorio). Si el proyecto todavía
 * no tiene ninguno, el diálogo lo avisa en vez de mostrar el formulario.
 */
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { estadoEntregable, etiquetaEstadoEntregable } from "@/lib/entregables";
import type { EntregableVista } from "@/lib/schemas/entregable";
import { cerrarVersionProyectoSchema, type CerrarVersionProyectoInput } from "@/lib/schemas/versionProyecto";
import { formatearFecha } from "@/lib/utils";

export function DialogoCerrarVersion({
  abierto,
  sugerencia,
  hayBorrador,
  entregables,
  hoy,
  esDueno,
  onCerrar,
  onConfirmar,
}: {
  abierto: boolean;
  sugerencia: { numeroVersion: number; numeroBuild: number; numeroPatch: number };
  hayBorrador: boolean;
  entregables: EntregableVista[];
  hoy: string;
  esDueno: boolean;
  onCerrar: () => void;
  // Devuelve el mensaje de error del servidor, o null si se cerró.
  onConfirmar: (datos: CerrarVersionProyectoInput) => Promise<string | null>;
}) {
  const [numeros, setNumeros] = useState({
    numeroVersion: String(sugerencia.numeroVersion),
    numeroBuild: String(sugerencia.numeroBuild),
    numeroPatch: String(sugerencia.numeroPatch),
  });
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [entregableId, setEntregableId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    const datos = cerrarVersionProyectoSchema.safeParse({
      numeroVersion: numeros.numeroVersion === "" ? Number.NaN : Number(numeros.numeroVersion),
      numeroBuild: numeros.numeroBuild === "" ? Number.NaN : Number(numeros.numeroBuild),
      numeroPatch: numeros.numeroPatch === "" ? Number.NaN : Number(numeros.numeroPatch),
      nombre: nombre || undefined,
      descripcion: descripcion || undefined,
      entregableId,
    });
    if (!datos.success) {
      const issue = datos.error.issues[0];
      const esNumero = ["numeroVersion", "numeroBuild", "numeroPatch"].includes(String(issue?.path[0]));
      setError(esNumero && issue?.code === "invalid_type"
        ? "Version, Build y Patch tienen que ser números enteros no negativos."
        : issue?.message ?? "Datos inválidos");
      return;
    }
    setEnviando(true);
    setError(await onConfirmar(datos.data));
    setEnviando(false);
  };

  const campoNumero = (campo: keyof typeof numeros, etiqueta: string) => (
    <div className="flex-1">
      <label htmlFor={`cerrar-${campo}`} className="mb-2 block text-sm font-medium">
        {etiqueta}
      </label>
      <Input
        id={`cerrar-${campo}`}
        inputMode="numeric"
        value={numeros[campo]}
        onChange={(e) => setNumeros({ ...numeros, [campo]: e.target.value.trim() })}
      />
    </div>
  );

  return (
    <Dialog
      abierto={abierto}
      titulo="Cerrar la versión en desarrollo"
      descripcion="La documentación queda registrada con este número y se abre una versión nueva para seguir trabajando."
      onCerrar={onCerrar}
    >
      {hayBorrador ? (
        <>
          <Alert variant="warning">
            <p className="font-semibold">Tenés cambios sin confirmar</p>
            <p className="mt-1">Confirmalos o descartalos antes de cerrar la versión.</p>
          </Alert>
          <Button type="button" variant="outline" className="self-end" onClick={onCerrar}>
            Volver
          </Button>
        </>
      ) : entregables.length === 0 ? (
        <>
          <Alert variant="warning">
            <p className="font-semibold">Todavía no hay entregables</p>
            <p className="mt-1">
              Cada versión cerrada corresponde a un entregable del proyecto.{" "}
              {esDueno
                ? "Creá uno en “Información del proyecto” y volvé a cerrar la versión."
                : "Pedile al dueño del proyecto que cree uno en “Información del proyecto”."}
            </p>
          </Alert>
          <Button type="button" variant="outline" className="self-end" onClick={onCerrar}>
            Volver
          </Button>
        </>
      ) : (
        <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
          <fieldset className="flex gap-3">
            <legend className="sr-only">Número de versión</legend>
            {campoNumero("numeroVersion", "Version")}
            {campoNumero("numeroBuild", "Build")}
            {campoNumero("numeroPatch", "Patch")}
          </fieldset>
          <div>
            <label htmlFor="cerrar-entregable" className="mb-2 block text-sm font-medium">
              Entregable al que corresponde
            </label>
            <select
              id="cerrar-entregable"
              value={entregableId}
              onChange={(e) => setEntregableId(e.target.value)}
              className="h-10 w-full rounded-[var(--radius)] border border-input bg-card px-3 text-sm"
            >
              <option value="">Elegí un entregable…</option>
              {entregables.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre} · estimado {formatearFecha(e.fechaEstimada)} · {etiquetaEstadoEntregable[estadoEntregable(e, hoy)]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="cerrar-nombre" className="mb-2 block text-sm font-medium">
              Nombre (opcional)
            </label>
            <Input id="cerrar-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Entrega del parcial" />
          </div>
          <div>
            <label htmlFor="cerrar-descripcion" className="mb-2 block text-sm font-medium">
              Descripción (opcional)
            </label>
            <Textarea id="cerrar-descripcion" rows={3} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          </div>
          {error && (
            <Alert variant="error">
              <p className="font-semibold">No se pudo cerrar la versión</p>
              <p className="mt-1">{error}</p>
            </Alert>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCerrar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={enviando}>
              {enviando ? "Cerrando…" : "Cerrar versión"}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
