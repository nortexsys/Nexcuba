import { getServerClient } from '@/lib/supabase/server';
import { es } from '@/locales/es';

/** Minimal landing until the applications inbox arrives (task 4.2). */
export default async function AdminHomePage() {
  const supabase = await getServerClient();
  const { count } = await supabase
    .from('registration_applications')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');

  return (
    <section className="rounded-card bg-white p-8 text-ink">
      <h1 className="text-2xl font-bold">{es.auth.admin.title}</h1>
      <p className="mt-2 text-base font-medium text-gray-700">
        {es.auth.admin.pendingApplications(count ?? 0)}
      </p>
      <p className="mt-1 text-sm text-gray-500">{es.auth.admin.placeholder}</p>
    </section>
  );
}
