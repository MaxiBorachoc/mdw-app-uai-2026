/** Une clases Tailwind opcionales sin introducir una dependencia extra. */
export function cn(...clases: Array<string | false | null | undefined>) {
  return clases.filter(Boolean).join(" ");
}
