import Link from 'next/link';
import { ProfileForm } from '@/components/portal/ProfileForm';
import { GalleryManager } from '@/components/portal/GalleryManager';
import { listMunicipalities, listActiveSectors, listProvinces } from '@/lib/public/queries';
import { getOwnProfile } from '@/lib/server/portal/profile';
import { listOwnGalleryImages } from '@/lib/server/portal/gallery';
import { getServerClient } from '@/lib/supabase/server';
import { es } from '@/locales/es';

import { addGalleryImageAction, removeGalleryImageAction, saveCompanyAction } from '../actions';

const c = es.auth.portal.company;

/** Mi empresa (task 6.2): profile editor + gallery manager. */
export default async function CompanyPage() {
  const supabase = await getServerClient();
  const [profile, sectors, provinces, municipalities] = await Promise.all([
    getOwnProfile(supabase),
    listActiveSectors(supabase),
    listProvinces(supabase),
    listMunicipalities(supabase),
  ]);
  const gallery = profile ? await listOwnGalleryImages(supabase, profile.companyId) : [];

  return (
    <section className="grid gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">{c.title}</h1>
          <p className="mt-1 text-sm text-gray-500">{c.intro}</p>
        </div>
        {profile && (
          <Link
            href={`/empresas/${profile.slug}`}
            className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-ink hover:bg-gray-100"
          >
            {c.publicPreview}
          </Link>
        )}
      </div>

      {profile ? (
        <>
          <div className="rounded-card border border-gray-100 bg-white p-6">
            <ProfileForm
              action={saveCompanyAction}
              profile={{
                displayName: profile.displayName,
                description: profile.description,
                phone: profile.phone,
                website: profile.website,
                address: profile.address,
                provinceId: profile.provinceId,
                municipalityId: profile.municipalityId,
                socials: profile.socials,
                sectorIds: profile.sectorIds,
              }}
              provinces={provinces.map(({ id, name }) => ({ id, name }))}
              municipalities={municipalities.map(({ id, name, provinceId }) => ({
                id,
                name,
                provinceId,
              }))}
              sectors={sectors.map(({ id, name }) => ({ id, name }))}
            />
          </div>

          <div className="rounded-card border border-gray-100 bg-white p-6">
            <GalleryManager
              uploadAction={addGalleryImageAction}
              removeAction={removeGalleryImageAction}
              images={gallery}
            />
          </div>
        </>
      ) : (
        <p className="rounded-card border border-gray-100 bg-white p-6 text-sm text-gray-500">
          {es.auth.portal.dashboard.unavailable}
        </p>
      )}
    </section>
  );
}
