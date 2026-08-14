import { es } from '@/locales/es';

/** Placeholder dashboard — the real portal lands in milestone H6 (6.1). */
export default function PortalHomePage() {
  return (
    <section className="rounded-card border border-gray-200 bg-white p-8">
      <h1 className="text-2xl font-bold text-ink">{es.auth.portal.title}</h1>
      <p className="mt-2 text-base text-gray-600">{es.auth.portal.dashboardPlaceholder}</p>
    </section>
  );
}
