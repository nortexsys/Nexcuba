import type { Metadata } from 'next';
import { es } from '@/locales/es';

export const metadata: Metadata = {
  title: 'Resultados de búsqueda',
};

/**
 * Stub for the global search results page — wired to the search RPC in task
 * 7.2 (grouped by 5 entity types, dual view). Exists from H1 so the global
 * search bar never dead-ends.
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <h1 className="text-4xl font-extrabold text-ink">Resultados de búsqueda</h1>
      <p className="mt-2 text-sm text-gray-400">{q ? `Término: ${q}` : es.common.empty}</p>
      <p className="mt-8 text-sm text-gray-500">
        El buscador se conecta con la base de datos en el hito H7 (tareas 7.1–7.3).
      </p>
    </div>
  );
}
