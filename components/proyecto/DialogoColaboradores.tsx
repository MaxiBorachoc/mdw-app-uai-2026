"use client";

/**
 * H2: la ventana de colaboradores del proyecto. Usa la API de miembros
 * (docs/api.md), que vuelve a verificar todo en el servidor.
 *
 * - El dueño escribe un email, elige el rol con el que invita (Editor o Lector) y
 *   con Enter lo agrega. En la lista ve el estado de cada invitación, cambia el
 *   rol de los que aceptaron, quita colaboradores y vuelve a invitar a quien
 *   rechazó. El rol de una invitación pendiente no cambia: el correo ya salió.
 * - El resto de los colaboradores ve la lista (solo los aceptados) en solo lectura.
 */
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { RolProyecto } from "@prisma/client";
import { RolProyectoBadge } from "@/components/RolProyecto";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { agregarMiembroSchema, type RolColaborador } from "@/lib/schemas/miembro";

type EstadoInvitacion = "PENDIENTE" | "ACEPTADA" | "RECHAZADA";
type Miembro = { rol: RolProyecto; estado: EstadoInvitacion; usuario: { id: string; nombre: string; email: string } };

const etiquetaEstado: Record<EstadoInvitacion, { texto: string; variante: "neutral" | "success" | "danger" }> = {
  PENDIENTE: { texto: "Pendiente", variante: "neutral" },
  ACEPTADA: { texto: "Aceptada", variante: "success" },
  RECHAZADA: { texto: "Rechazada", variante: "danger" },
};

export function DialogoColaboradores({
  abierto,
  proyectoId,
  esDueno,
  onCerrar,
  onCambio,
}: {
  abierto: boolean;
  proyectoId: string;
  esDueno: boolean;
  onCerrar: () => void;
  // Avisa que la lista cambió, para refrescar lo que muestra la pantalla.
  onCambio: () => void;
}) {
  const [miembros, setMiembros] = useState<Miembro[] | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [rol, setRol] = useState<RolColaborador>("READER");
  const [errorEmail, setErrorEmail] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const url = `/api/proyectos/${proyectoId}/miembros`;

  const cargar = useCallback(async () => {
    setErrorCarga(null);
    try {
      const respuesta = await fetch(url);
      if (!respuesta.ok) throw new Error();
      setMiembros(await respuesta.json());
    } catch {
      setErrorCarga("No se pudo cargar la lista de colaboradores. Cerrá la ventana y probá de nuevo.");
    }
  }, [url]);

  useEffect(() => {
    if (abierto) void cargar();
  }, [abierto, cargar]);

  // Hace un pedido y, si salió bien, recarga la lista. Devuelve el mensaje de error o null.
  const pedir = async (metodo: string, ruta: string, cuerpo?: unknown): Promise<string | null> => {
    setOcupado(true);
    try {
      const respuesta = await fetch(ruta, {
        method: metodo,
        headers: cuerpo ? { "Content-Type": "application/json" } : undefined,
        body: cuerpo ? JSON.stringify(cuerpo) : undefined,
      });
      if (!respuesta.ok) {
        const datos = await respuesta.json().catch(() => null);
        return datos?.error ?? "No se pudo completar la acción. Probá de nuevo en unos segundos.";
      }
      await cargar();
      onCambio();
      return null;
    } catch {
      return "Revisá tu conexión y probá de nuevo.";
    } finally {
      setOcupado(false);
    }
  };

  const invitar = async (e: FormEvent) => {
    e.preventDefault();
    setErrorAccion(null);
    const datos = agregarMiembroSchema.safeParse({ email, rol });
    if (!datos.success) {
      setErrorEmail(datos.error.flatten().fieldErrors.email?.[0] ?? "Revisá el email");
      return;
    }
    const error = await pedir("POST", url, datos.data);
    setErrorEmail(error);
    if (!error) setEmail("");
  };

  const accion = async (metodo: string, ruta: string, cuerpo?: unknown) => {
    setErrorAccion(null);
    setErrorAccion(await pedir(metodo, ruta, cuerpo));
  };

  const quitar = (m: Miembro) => {
    if (!window.confirm(`¿Quitar a ${m.usuario.nombre} del proyecto? Pierde el acceso y recibe un correo avisándole.`)) return;
    void accion("DELETE", `${url}/${m.usuario.id}`);
  };

  return (
    <Dialog
      abierto={abierto}
      titulo="Colaboradores"
      descripcion={
        esDueno
          ? "Invitá a usuarios que ya iniciaron sesión alguna vez. Reciben un correo para aceptar o rechazar."
          : "Las personas que participan en este proyecto."
      }
      onCerrar={onCerrar}
    >
      {esDueno && (
        <form onSubmit={invitar} noValidate className="flex flex-col gap-1">
          <label htmlFor="colaborador-email" className="text-sm font-medium">
            Email del usuario
          </label>
          <div className="flex flex-wrap gap-2">
            <Input
              id="colaborador-email"
              type="email"
              autoComplete="off"
              className="min-w-0 flex-1"
              placeholder="nombre@ejemplo.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrorEmail(null);
              }}
              aria-invalid={errorEmail ? true : undefined}
              aria-describedby={errorEmail ? "colaborador-email-error" : "colaborador-email-ayuda"}
            />
            <label htmlFor="colaborador-rol" className="sr-only">
              Rol con el que se lo invita
            </label>
            <select
              id="colaborador-rol"
              value={rol}
              onChange={(e) => setRol(e.target.value as RolColaborador)}
              className="h-10 rounded-[var(--radius)] border border-input bg-card px-3 text-sm"
            >
              <option value="READER">Lector</option>
              <option value="EDITOR">Editor</option>
            </select>
            <Button type="submit" disabled={ocupado}>
              Invitar
            </Button>
          </div>
          {errorEmail ? (
            <p id="colaborador-email-error" className="text-sm text-destructive">
              {errorEmail}
            </p>
          ) : (
            <p id="colaborador-email-ayuda" className="text-xs text-muted-foreground">
              Escribí el email y apretá Enter.
            </p>
          )}
        </form>
      )}

      {errorAccion && (
        <Alert variant="error">
          <p>{errorAccion}</p>
        </Alert>
      )}
      {errorCarga && (
        <Alert variant="error">
          <p>{errorCarga}</p>
        </Alert>
      )}
      {!miembros && !errorCarga && <p className="text-sm text-muted-foreground">Cargando colaboradores…</p>}

      {miembros && (
        <ul className="flex max-h-80 flex-col divide-y overflow-y-auto">
          {miembros.map((m) => (
            <li key={m.usuario.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{m.usuario.nombre}</p>
                <p className="truncate text-xs text-muted-foreground">{m.usuario.email}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {esDueno && m.rol !== "OWNER" && (
                  <Badge variant={etiquetaEstado[m.estado].variante}>{etiquetaEstado[m.estado].texto}</Badge>
                )}
                {esDueno && m.rol !== "OWNER" && m.estado === "ACEPTADA" ? (
                  <>
                    <label htmlFor={`rol-${m.usuario.id}`} className="sr-only">
                      Rol de {m.usuario.nombre}
                    </label>
                    <select
                      id={`rol-${m.usuario.id}`}
                      value={m.rol}
                      disabled={ocupado}
                      onChange={(e) => void accion("PATCH", `${url}/${m.usuario.id}`, { rol: e.target.value })}
                      className="h-8 rounded-[var(--radius)] border border-input bg-card px-2 text-sm"
                    >
                      <option value="READER">Lector</option>
                      <option value="EDITOR">Editor</option>
                    </select>
                  </>
                ) : (
                  <RolProyectoBadge rol={m.rol} />
                )}
                {esDueno && m.estado === "RECHAZADA" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={ocupado}
                    onClick={() => void accion("POST", url, { email: m.usuario.email, rol: m.rol })}
                  >
                    Volver a invitar
                  </Button>
                )}
                {esDueno && m.rol !== "OWNER" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={ocupado}
                    aria-label={`Quitar a ${m.usuario.nombre}`}
                    onClick={() => quitar(m)}
                  >
                    Quitar
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <Button type="button" variant="outline" className="self-end" onClick={onCerrar}>
        Cerrar
      </Button>
    </Dialog>
  );
}
