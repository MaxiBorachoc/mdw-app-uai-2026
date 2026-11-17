"use client";

/**
 * H14: crear o editar un entregable (incluido marcarlo como entregado). Valida con
 * el mismo schema que el servidor; quien lo usa hace el pedido y devuelve el
 * mensaje de error, o null si salió bien.
 */
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { entregableSchema, type EntregableInput } from "@/lib/schemas/entregable";
import { hoyEnArgentina } from "@/lib/utils";

type Campos = { nombre: string; descripcion: string; fechaEstimada: string; entregado: boolean; fechaEntrega: string };
type Errores = Partial<Record<keyof Campos, string>>;

export function FormularioEntregable({
  idBase,
  inicial,
  textoGuardar,
  onGuardar,
  onCancelar,
}: {
  idBase: string;
  inicial?: EntregableInput;
  textoGuardar: string;
  onGuardar: (datos: EntregableInput) => Promise<string | null>;
  onCancelar: () => void;
}) {
  const [campos, setCampos] = useState<Campos>({
    nombre: inicial?.nombre ?? "",
    descripcion: inicial?.descripcion ?? "",
    fechaEstimada: inicial?.fechaEstimada ?? "",
    entregado: inicial?.entregado ?? false,
    fechaEntrega: inicial?.fechaEntrega ?? "",
  });
  const [errores, setErrores] = useState<Errores>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cambiar = (cambio: Partial<Campos>) => setCampos((c) => ({ ...c, ...cambio }));
  const id = (campo: keyof Campos) => `${idBase}-${campo}`;
  const describir = (campo: keyof Campos) => ({
    "aria-invalid": errores[campo] ? true : undefined,
    "aria-describedby": errores[campo] ? `${id(campo)}-error` : undefined,
  });
  const error = (campo: keyof Campos) =>
    errores[campo] && (
      <p id={`${id(campo)}-error`} className="mt-1 text-sm text-destructive">
        {errores[campo]}
      </p>
    );

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    const resultado = entregableSchema.safeParse({
      ...campos,
      fechaEstimada: campos.fechaEstimada,
      fechaEntrega: campos.entregado && campos.fechaEntrega ? campos.fechaEntrega : null,
    });
    if (!resultado.success) {
      const porCampo = resultado.error.flatten().fieldErrors;
      setErrores({
        nombre: porCampo.nombre?.[0],
        descripcion: porCampo.descripcion?.[0],
        fechaEstimada: campos.fechaEstimada ? porCampo.fechaEstimada?.[0] : "Indicá la fecha estimada de entrega",
        fechaEntrega: porCampo.fechaEntrega?.[0],
      });
      return;
    }
    setErrores({});
    setGuardando(true);
    setErrorGeneral(await onGuardar(resultado.data));
    setGuardando(false);
  };

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-3 rounded-[var(--radius)] border bg-muted/40 p-3">
      <div>
        <label htmlFor={id("nombre")} className="mb-1 block text-sm font-medium">
          Nombre
        </label>
        <Input id={id("nombre")} value={campos.nombre} onChange={(e) => cambiar({ nombre: e.target.value })} {...describir("nombre")} />
        {error("nombre")}
      </div>
      <div>
        <label htmlFor={id("descripcion")} className="mb-1 block text-sm font-medium">
          Descripción (opcional)
        </label>
        <Textarea
          id={id("descripcion")}
          rows={2}
          value={campos.descripcion}
          onChange={(e) => cambiar({ descripcion: e.target.value })}
          {...describir("descripcion")}
        />
        {error("descripcion")}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={id("fechaEstimada")} className="mb-1 block text-sm font-medium">
            Fecha estimada de entrega
          </label>
          <Input
            id={id("fechaEstimada")}
            type="date"
            value={campos.fechaEstimada}
            onChange={(e) => cambiar({ fechaEstimada: e.target.value })}
            {...describir("fechaEstimada")}
          />
          {error("fechaEstimada")}
        </div>
        <div>
          <div className="mb-1 flex items-center gap-2">
            <input
              id={id("entregado")}
              type="checkbox"
              className="size-4"
              checked={campos.entregado}
              onChange={(e) => cambiar({ entregado: e.target.checked, fechaEntrega: e.target.checked ? campos.fechaEntrega || hoyEnArgentina() : "" })}
            />
            <label htmlFor={id("entregado")} className="text-sm font-medium">
              Entregado
            </label>
          </div>
          {campos.entregado && (
            <>
              <label htmlFor={id("fechaEntrega")} className="sr-only">
                Fecha de entrega
              </label>
              <Input
                id={id("fechaEntrega")}
                type="date"
                max={hoyEnArgentina()}
                value={campos.fechaEntrega}
                onChange={(e) => cambiar({ fechaEntrega: e.target.value })}
                {...describir("fechaEntrega")}
              />
              {error("fechaEntrega")}
            </>
          )}
        </div>
      </div>
      {errorGeneral && (
        <Alert variant="error">
          <p>{errorGeneral}</p>
        </Alert>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" size="sm" variant="outline" onClick={onCancelar} disabled={guardando}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={guardando}>
          {guardando ? "Guardando…" : textoGuardar}
        </Button>
      </div>
    </form>
  );
}
