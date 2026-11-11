import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProyectoDetalleLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6" aria-busy="true" aria-label="Cargando proyecto">
      <Skeleton className="h-4 w-36" />
      <Skeleton className="mt-4 h-9 w-72 max-w-full" />
      <Skeleton className="mt-3 h-5 w-full max-w-2xl" />
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {[0, 1].map((item) => (
          <Card key={item}>
            <CardHeader>
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
