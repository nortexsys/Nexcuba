import { es } from '@/locales/es';

/**
 * Networking hub placeholder — the contact request form (target company via
 * ?empresa=slug) lands in milestone H8 (tasks 8.1/8.2).
 */
export default async function ContactosPage({
  searchParams,
}: {
  searchParams: Promise<{ empresa?: string }>;
}) {
  const { empresa } = await searchParams;

  return (
    <section className="rounded-card border border-gray-200 bg-white p-8">
      <h1 className="text-2xl font-bold text-ink">{es.auth.portal.title}</h1>
      {empresa ? (
        <p className="mt-2 text-base text-gray-600">
          Contactar mediante NexCuba con <strong className="text-ink">{empresa}</strong>: disponible
          en el siguiente hito (H8 · Networking).
        </p>
      ) : (
        <p className="mt-2 text-base text-gray-600">
          La gestión de solicitudes de contacto llega en el siguiente hito (H8 · Networking).
        </p>
      )}
    </section>
  );
}
