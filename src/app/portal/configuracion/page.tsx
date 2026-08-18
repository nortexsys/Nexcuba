import { EmailChangeForm, PasswordForm } from '@/components/portal/AccountForms';
import { getServerClient } from '@/lib/supabase/server';
import { es } from '@/locales/es';

import { changePasswordAction, requestEmailChangeAction } from '../actions';

const c = es.auth.portal.settings;

/** Configuración (task 6.4): staged email change + password change. */
export default async function SettingsPage() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <section className="grid max-w-2xl gap-8">
      <div>
        <h1 className="text-2xl font-bold text-ink">{c.title}</h1>
        {user?.email && (
          <p className="mt-1 text-sm text-gray-500">
            {c.currentEmail}: <span className="font-medium text-ink">{user.email}</span>
          </p>
        )}
      </div>

      <div className="rounded-card border border-gray-100 bg-white p-6">
        <h2 className="text-base font-bold text-ink">{c.emailTitle}</h2>
        <div className="mt-4">
          <EmailChangeForm action={requestEmailChangeAction} />
        </div>
      </div>

      <div className="rounded-card border border-gray-100 bg-white p-6">
        <h2 className="text-base font-bold text-ink">{c.passwordTitle}</h2>
        <div className="mt-4">
          <PasswordForm action={changePasswordAction} />
        </div>
      </div>
    </section>
  );
}
