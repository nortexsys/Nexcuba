import { notFound } from 'next/navigation';
import { ActionButton } from '@/components/admin/ActionButton';
import { CrmForm } from '@/components/admin/CrmForm';
import { Badge } from '@/components/ui/Badge';
import { getCrmRecord } from '@/lib/server/backoffice/crm';
import { getPremiumHistory } from '@/lib/server/backoffice/companies';
import { getServerClient } from '@/lib/supabase/server';
import { es } from '@/locales/es';

import {
  activatePremiumAction,
  deactivatePremiumAction,
  saveCrmAction,
  setFeaturedAction,
} from './actions';

export const dynamic = 'force-dynamic';

const c = es.auth.admin.companies;
const d = c.detail;

interface CompanyRow {
  id: string;
  legal_name: string;
  display_name: string | null;
  entity_type: string;
  status: string;
  is_featured: boolean;
  premium_until: string | null;
  profile_completeness: number;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  created_at: string;
}

/** Company administrative detail (tasks 4.3/4.4/4.9). */
export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getServerClient();

  const [{ data: companyData }, { data: sectors }, crm, premiumHistory] = await Promise.all([
    supabase.from('companies').select('*').eq('id', id).maybeSingle(),
    supabase.from('company_sectors').select('sectors(name)').eq('company_id', id),
    getCrmRecord(supabase, id),
    getPremiumHistory(supabase, id),
  ]);

  const company = companyData as CompanyRow | null;
  if (!company) notFound();

  const premiumActive =
    company.premium_until !== null && new Date(company.premium_until).getTime() > Date.now();
  const sectorNames = ((sectors ?? []) as Record<string, unknown>[])
    .map((row) => {
      const relation = row.sectors as { name: string } | { name: string }[] | null | undefined;
      return Array.isArray(relation) ? relation[0]?.name : relation?.name;
    })
    .filter((name): name is string => Boolean(name));

  return (
    <section className="grid gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{company.legal_name}</h1>
        <Badge>{c.status[company.status as 'approved'] ?? company.status}</Badge>
        <Badge variant="verified">{c.entityType[company.entity_type as 'mipyme']}</Badge>
        {company.is_featured && <Badge variant="premium">★ {c.featuredYes}</Badge>}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-card border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">{d.data}</h2>
          <dl className="mt-3 grid gap-2 text-sm">
            {company.display_name && (
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">{d.displayName}</dt>
                <dd className="font-medium">{company.display_name}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">{d.email}</dt>
              <dd>{company.email ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">{d.phone}</dt>
              <dd>{company.phone ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">{d.website}</dt>
              <dd>{company.website ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">{d.address}</dt>
              <dd>{company.address ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">{d.completeness}</dt>
              <dd className="font-medium">{company.profile_completeness}%</dd>
            </div>
            {sectorNames.length > 0 && (
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Sectores</dt>
                <dd>{sectorNames.join(', ')}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="grid content-start gap-6">
          <div className="rounded-card border border-gray-200 bg-white p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              {d.administrative}
            </h2>
            <div className="mt-3 grid gap-3">
              <ActionButton
                action={setFeaturedAction}
                fields={{ companyId: company.id, featured: company.is_featured ? 'off' : 'on' }}
                label={company.is_featured ? d.toggleFeaturedOff : d.toggleFeaturedOn}
                compact
              />
            </div>
          </div>

          <div className="rounded-card border border-gray-200 bg-white p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              {d.premiumTitle}
            </h2>
            <p className="mt-2 text-xs text-gray-500">{d.premiumNote}</p>
            <div className="mt-3 grid gap-3">
              {premiumActive ? (
                <>
                  <p className="text-sm text-gray-700">
                    <Badge variant="premium">
                      {c.premiumUntil(company.premium_until!.slice(0, 10))}
                    </Badge>
                  </p>
                  <ActionButton
                    action={deactivatePremiumAction}
                    fields={{ companyId: company.id }}
                    label={d.deactivatePremium}
                    danger
                    compact
                  />
                </>
              ) : (
                <ActionButton
                  action={activatePremiumAction}
                  fields={{ companyId: company.id, months: '12' }}
                  label={d.activatePremium}
                  compact
                />
              )}
            </div>
            {premiumHistory.length > 0 && (
              <div className="mt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {d.premiumHistory}
                </h3>
                <ul className="mt-2 grid gap-1 text-xs text-gray-600">
                  {premiumHistory.map((entry) => (
                    <li key={entry.createdAt}>
                      {new Date(entry.createdAt).toLocaleString('es-ES')} ·{' '}
                      {String(entry.metadata.premium_until ?? '').slice(0, 10)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {premiumHistory.length === 0 && (
              <p className="mt-3 text-xs text-gray-400">{d.premiumNoHistory}</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-card border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          {d.crmTitle}
        </h2>
        <div className="mt-4 max-w-2xl">
          <CrmForm
            action={saveCrmAction}
            initial={
              crm
                ? {
                    hasWebsite: crm.hasWebsite,
                    hasDomain: crm.hasDomain,
                    hasCorporateEmail: crm.hasCorporateEmail,
                    hasSocials: crm.hasSocials,
                    digitalNeeds: crm.digitalNeeds,
                    commercialPotential: crm.commercialPotential,
                    followupStatus: crm.followupStatus,
                    notes: crm.notes,
                  }
                : undefined
            }
          />
        </div>
      </div>
    </section>
  );
}
