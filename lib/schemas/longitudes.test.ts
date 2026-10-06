import { describe, expect, it } from "vitest";
import {
  crearProyectoSchema,
  DESCRIPCION_PROYECTO_MAX,
  NOMBRE_PROYECTO_MAX,
} from "./proyecto";
import {
  cerrarVersionProyectoSchema,
  DESCRIPCION_VERSION_MAX,
  NOMBRE_VERSION_MAX,
} from "./versionProyecto";

const letras = (n: number) => "a".repeat(n);
const version = { numeroVersion: 1, numeroBuild: 0, numeroPatch: 0 };

describe("longitudes maximas del proyecto (H1)", () => {
  it("acepta un nombre y una descripcion justo en el maximo", () => {
    const r = crearProyectoSchema.safeParse({
      nombre: letras(NOMBRE_PROYECTO_MAX),
      descripcion: letras(DESCRIPCION_PROYECTO_MAX),
    });
    expect(r.success).toBe(true);
  });

  it("rechaza un nombre un caracter por encima del maximo", () => {
    const r = crearProyectoSchema.safeParse({ nombre: letras(NOMBRE_PROYECTO_MAX + 1) });
    expect(r.success).toBe(false);
  });

  it("rechaza una descripcion un caracter por encima del maximo", () => {
    const r = crearProyectoSchema.safeParse({
      nombre: "Proyecto",
      descripcion: letras(DESCRIPCION_PROYECTO_MAX + 1),
    });
    expect(r.success).toBe(false);
  });

  it("borde: los espacios al borde no cuentan para el maximo", () => {
    const r = crearProyectoSchema.safeParse({ nombre: `  ${letras(NOMBRE_PROYECTO_MAX)}  ` });
    expect(r.success).toBe(true);
  });
});

describe("longitudes maximas de la version de proyecto (H8)", () => {
  it("acepta nombre y descripcion justo en el maximo", () => {
    const r = cerrarVersionProyectoSchema.safeParse({
      ...version,
      nombre: letras(NOMBRE_VERSION_MAX),
      descripcion: letras(DESCRIPCION_VERSION_MAX),
    });
    expect(r.success).toBe(true);
  });

  it("rechaza un nombre por encima del maximo", () => {
    const r = cerrarVersionProyectoSchema.safeParse({ ...version, nombre: letras(NOMBRE_VERSION_MAX + 1) });
    expect(r.success).toBe(false);
  });

  it("rechaza una descripcion por encima del maximo", () => {
    const r = cerrarVersionProyectoSchema.safeParse({
      ...version,
      descripcion: letras(DESCRIPCION_VERSION_MAX + 1),
    });
    expect(r.success).toBe(false);
  });

  it("borde: nombre y descripcion siguen siendo opcionales", () => {
    expect(cerrarVersionProyectoSchema.safeParse(version).success).toBe(true);
  });
});
