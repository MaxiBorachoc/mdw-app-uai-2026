import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SinDatos({
  titulo,
  descripcion,
}: {
  titulo: string;
  descripcion: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
        <CardDescription>{descripcion}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-xs font-medium uppercase tracking-wide text-primary">Estado informativo</p>
      </CardContent>
    </Card>
  );
}
