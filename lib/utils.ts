/** Une clases Tailwind opcionales sin introducir una dependencia extra. */
export function cn(...clases: Array<string | false | null | undefined>) {
  return clases.filter(Boolean).join(" ");
}

/** "1 flecha", "3 flechas": el número con la palabra en singular o plural. */
export function cantidad(n: number, singular: string, plural: string) {
  return `${n} ${n === 1 ? singular : plural}`;
}
