"use client";

/**
 * H12: los cambios que confirmaron otros usuarios mientras este tenía un
 * borrador, agrupados por usuario. Un cambio en una flecha o en un carril se informa
 * como un cambio en la actividad cuyo diagrama lo contiene.
 */
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

export type CambioDeOtroVista = {
  tipo: "HISTORIA" | "ACTIVIDAD" | "CONEXION" | "CARRIL";
  elementoId: string;
  numeroVersion: number;
  nombre: string;
  accion: "CREO" | "MODIFICO" | "ELIMINO";
  autor: { id: string; nombre: string };
};

const verbo = { CREO: "Se creó", MODIFICO: "Se modificó", ELIMINO: "Se eliminó" } as const;
const tipoTexto = { HISTORIA: "Historia", ACTIVIDAD: "Actividad", CONEXION: "Actividad", CARRIL: "Actividad" } as const;

export function DialogoCambiosDeOtros({
  abierto,
  cambios,
  conflictos,
  onActualizar,
  onCerrar,
}: {
  abierto: boolean;
  cambios: CambioDeOtroVista[];
  // Ids de elementos que el usuario tiene modificados y otro también cambió.
  conflictos: Set<string>;
  onActualizar: () => void;
  onCerrar: () => void;
}) {
  const porAutor = new Map<string, { nombre: string; lineas: Map<string, { texto: string; conflicto: boolean }> }>();
  for (const c of cambios) {
    const grupo = porAutor.get(c.autor.id) ?? { nombre: c.autor.nombre, lineas: new Map() };
    // Una flecha o un carril cuenta como "se modificó la actividad cuyo diagrama lo
    // contiene" (con su nombre).
    const accion = c.tipo === "CONEXION" || c.tipo === "CARRIL" ? "MODIFICO" : c.accion;
    const texto = `${verbo[accion]} ${tipoTexto[c.tipo]} ${c.nombre}`;
    const previa = grupo.lineas.get(texto);
    grupo.lineas.set(texto, { texto, conflicto: (previa?.conflicto ?? false) || conflictos.has(c.elementoId) });
    porAutor.set(c.autor.id, grupo);
  }

  return (
    <Dialog
      abierto={abierto}
      titulo="Cambios de otros usuarios"
      descripcion="Otros colaboradores confirmaron cambios mientras editabas."
      onCerrar={onCerrar}
    >
      {conflictos.size > 0 && (
        <Alert variant="warning">
          <p className="font-semibold">Algunos cambios chocan con tu borrador</p>
          <p className="mt-1">
            No vas a poder confirmar mientras tanto. Al actualizar se traen los cambios de los demás y se descartan tus
            cambios en los elementos marcados; el resto de tu borrador se conserva.
          </p>
        </Alert>
      )}
      <div className="flex max-h-80 flex-col gap-4 overflow-auto">
        {[...porAutor.values()].map((grupo) => (
          <section key={grupo.nombre}>
            <h3 className="text-sm font-semibold">Cambios realizados por {grupo.nombre}:</h3>
            <ul className="mt-1 flex flex-col gap-1 text-sm">
              {[...grupo.lineas.values()].map((l) => (
                <li key={l.texto} className="flex flex-wrap items-center gap-2">
                  <span>{l.texto}</span>
                  {l.conflicto && <Badge variant="warning">Choca con tu borrador</Badge>}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCerrar}>
          Seguir editando
        </Button>
        <Button type="button" onClick={onActualizar}>
          Actualizar
        </Button>
      </div>
    </Dialog>
  );
}
