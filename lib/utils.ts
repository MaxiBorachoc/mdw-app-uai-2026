/** Une clases Tailwind opcionales sin introducir una dependencia extra. */
export function cn(...clases: Array<string | false | null | undefined>) {
  return clases.filter(Boolean).join(" ");
}

/** "1 flecha", "3 flechas": el número con la palabra en singular o plural. */
export function cantidad(n: number, singular: string, plural: string) {
  return `${n} ${n === 1 ? singular : plural}`;
}

const formatoDiaArgentina = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Argentina/Buenos_Aires",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * La fecha de hoy en Argentina como "AAAA-MM-DD". Las fechas sin hora del
 * sistema (inicio del proyecto, entregas) se comparan como texto en ese
 * formato: el orden alfabético coincide con el cronológico.
 */
export function hoyEnArgentina(ahora: Date = new Date()) {
  return formatoDiaArgentina.format(ahora);
}

/** Una columna DATE de la base (llega como Date a las 00:00 UTC) como "AAAA-MM-DD". */
export function textoDeFecha(fecha: Date) {
  return fecha.toISOString().slice(0, 10);
}

/** "AAAA-MM-DD" como Date para guardar en una columna DATE. */
export function fechaDeTexto(texto: string) {
  return new Date(`${texto}T00:00:00Z`);
}

const formatoFechaCorta = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeZone: "UTC" });

/** "2026-11-17" → "17 nov 2026". La fecha no tiene hora: se formatea en UTC para no correrla de día. */
export function formatearFecha(texto: string) {
  return formatoFechaCorta.format(fechaDeTexto(texto));
}

const sinTildes = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es");

/** Si `texto` contiene `busqueda`, sin distinguir mayúsculas ni tildes. Una búsqueda vacía coincide con todo. */
export function contieneTexto(texto: string, busqueda: string) {
  return sinTildes(texto).includes(sinTildes(busqueda.trim()));
}
