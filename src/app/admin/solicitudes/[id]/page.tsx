import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ActionButton } from '@/components/admin/ActionButton';
import { Badge } from '@/components/ui/Badge';
import { getApplicationDetail } from '@/lib/server/backoffice/applications';
import { getServerClient } from '@/lib/supabase/server';
import { es } from '@/locales/es';

import { approveApplicationAction, rejectApplicationAction } from './actions';

export const dynamic = 'force-dynamic';

const a = es.auth.admin.applications;
const d = a.detail;

const PAYLOAD_LABELS: Record<string, string> = {
  applicantFirstName: 'Nombre del solicitante',
  applicantLastName: 'Apellidos del solicitante',
  phone: 'Teléfono',
  companyName: 'Nombre de la empresa',
  entityType: 'Tipo de entidad',
  provinceId: 'Provincia (id)',
  municipalityId: 'Municipio (id)',
  address: 'Dirección física',
  extraIdData: 'Datos identificativos adicionales',
  country: 'País',
  website: 'Página web',
};

/** Application review (task 4.2): full data, document viewer, decision. */
export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await getServerClient();
  const application = await getApplicationDetail(supabase, id);
  if (!application) notFound();

  const pending = application.status === 'pending';
  const payloadEntries = Object.entries(application.payload).filter(
    ([key, value]) => PAYLOAD_LABELS[key] !== undefined && typeof value !== 'object',
  );

  return (
    <section className="grid gap-6">
      <div>
        <Link href="/admin/solicitudes" className="text-sm text-gray-600 underline hover:text-ink">
          ← {d.back}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{application.companyName}</h1>
        <p className="mt-1 flex items-center gap-2 text-sm text-gray-600">
          <Badge>
            {application.status === 'pending'
              ? a.status.pending
              : application.status === 'approved'
                ? a.status.approved
                : a.status.rejected}
          </Badge>
          {d.submitted}: {new Date(application.createdAt).toLocaleString('es-ES')}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-card border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            {d.applicant}
          </h2>
          <dl className="mt-3 grid gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">{a.table.applicant}</dt>
              <dd className="font-medium">{application.applicantName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">{a.table.email}</dt>
              <dd>{application.applicantEmail}</dd>
            </div>
            {application.applicantPhone && (
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">{es.auth.admin.companies.detail.phone}</dt>
                <dd>{application.applicantPhone}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="rounded-card border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            {d.company}
          </h2>
          <dl className="mt-3 grid gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">{a.table.type}</dt>
              <dd>
                {es.auth.admin.companies.entityType[application.entityType as 'mipyme'] ??
                  application.entityType}
              </dd>
            </div>
            {application.company?.email && (
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">{a.table.email}</dt>
                <dd>{application.company.email}</dd>
              </div>
            )}
            {application.company?.phone && (
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">{es.auth.admin.companies.detail.phone}</dt>
                <dd>{application.company.phone}</dd>
              </div>
            )}
            {application.company?.website && (
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">{d.website}</dt>
                <dd>
                  <a
                    href={application.company.website}
                    target="_blank"
                    rel="noreferrer"
                    className="underline hover:text-ink"
                  >
                    {application.company.website}
                  </a>
                </dd>
              </div>
            )}
            {application.company?.address && (
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">{es.auth.admin.companies.detail.address}</dt>
                <dd>{application.company.address}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {payloadEntries.length > 0 && (
        <div className="rounded-card border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            {d.payload}
          </h2>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            {payloadEntries.map(([key, value]) => (
              <div key={key} className="flex justify-between gap-4">
                <dt className="text-gray-500">{PAYLOAD_LABELS[key]}</dt>
                <dd className="font-medium">{String(value)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <div className="rounded-card border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          {d.documents}
        </h2>
        {application.documents.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">{d.noDocuments}</p>
        ) : (
          <ul className="mt-3 grid gap-2 text-sm">
            {application.documents.map((document) => (
              <li key={document.id} className="flex flex-wrap items-center gap-3">
                <span className="text-gray-500">{document.mime}</span>
                <span className="text-gray-400">
                  {Math.max(1, Math.round(document.sizeBytes / 1024))} KB
                </span>
                {document.url ? (
                  <a
                    href={document.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full bg-ink px-4 py-1.5 text-xs font-medium text-white hover:bg-gray-800"
                  >
                    {d.openDocument}
                  </a>
                ) : (
                  <span className="text-xs text-red-600">URL no disponible</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {pending ? (
        <div className="grid gap-6 rounded-card border border-gray-200 bg-white p-6 lg:grid-cols-2">
          <ActionButton
            action={approveApplicationAction}
            fields={{ applicationId: application.id }}
            label={d.approve}
          />
          <ActionButton
            action={rejectApplicationAction}
            fields={{ applicationId: application.id }}
            label={d.confirmReject}
            danger
            textarea={{
              name: 'reason',
              placeholder: d.rejectReason,
              minLength: 10,
              hint: d.rejectReasonHint,
            }}
          />
        </div>
      ) : (
        <div className="rounded-card border border-gold bg-cream-50 p-6 text-sm text-gray-700">
          <p>{d.notPending}</p>
          {application.rejectionReason && (
            <p className="mt-2">
              <strong>{d.rejectReason}:</strong> {application.rejectionReason}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
