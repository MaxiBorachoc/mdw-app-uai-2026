import type { RolProyecto } from "@prisma/client";
import { Badge } from "@/components/ui/badge";

const etiquetas: Record<RolProyecto, string> = {
  OWNER: "Dueño",
  EDITOR: "Editor",
  READER: "Lector",
};

export function RolProyectoBadge({ rol }: { rol: RolProyecto }) {
  const variant = rol === "OWNER" ? "blue" : rol === "EDITOR" ? "success" : "neutral";
  return <Badge variant={variant}>{etiquetas[rol]}</Badge>;
}
