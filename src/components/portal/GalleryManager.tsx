'use client';

import { useActionState } from 'react';
import { initialAdminActionState } from '@/lib/admin/form';
import { applyMediaTransform } from '@/lib/public/queries';
import { es } from '@/locales/es';
import type { PortalAction } from '@/components/portal/ProfileForm';

const c = es.auth.portal.gallery;

export interface GalleryManagerProps {
  uploadAction: PortalAction;
  removeAction: PortalAction;
  images: { id: string; url: string; alt: string | null }[];
}

const inputClass =
  'block w-full rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-ink placeholder:text-gray-400 focus:border-ink';

/** Own gallery manager (task 6.2): ≤8 images, upload + remove. */
export function GalleryManager({ uploadAction, removeAction, images }: GalleryManagerProps) {
  const [uploadState, uploadFormAction, uploading] = useActionState(
    uploadAction,
    initialAdminActionState,
  );

  return (
    <section className="grid gap-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold text-ink">{c.title}</h2>
        <p className="text-xs text-gray-500">{c.hint}</p>
      </header>

      {images.length === 0 ? (
        <p className="rounded-card border border-gray-100 bg-white p-4 text-sm text-gray-500">
          {c.empty}
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {images.map((image) => (
            <GalleryThumb key={image.id} image={image} removeAction={removeAction} />
          ))}
        </ul>
      )}

      <form action={uploadFormAction} className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-xs font-medium text-gray-600">
          {c.add}
          {/* No `required`: jsdom cannot revalidate file inputs; the server
              action answers with gallery.noFile when missing. */}
          <input
            type="file"
            name="file"
            accept="image/jpeg,image/png,image/webp"
            className="block w-full text-sm text-ink file:mr-3 file:rounded-full file:border-0 file:bg-cream-100 file:px-4 file:py-2 file:text-xs file:font-medium file:text-ink"
          />
        </label>
        <label className="grid flex-1 gap-1 text-xs font-medium text-gray-600">
          {es.auth.portal.content.form.altPlaceholder}
          <input type="text" name="alt" placeholder={c.altPlaceholder} className={inputClass} />
        </label>
        <button
          type="submit"
          disabled={uploading}
          className="rounded-full bg-ink px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? c.adding : c.add}
        </button>
      </form>
      {uploadState.status === 'error' && uploadState.message && (
        <p role="alert" className="text-sm text-red-600">
          {uploadState.message}
        </p>
      )}
      {uploadState.status === 'success' && (
        <p role="status" className="text-sm text-gray-700">
          {es.auth.portal.content.saved}
        </p>
      )}
    </section>
  );
}

function GalleryThumb({
  image,
  removeAction,
}: {
  image: { id: string; url: string; alt: string | null };
  removeAction: PortalAction;
}) {
  const [, removeFormAction, removing] = useActionState(removeAction, initialAdminActionState);
  return (
    <li className="overflow-hidden rounded-card border border-gray-100 bg-white">
      {/* eslint-disable-next-line @next/next/no-img-element -- portal manager: arbitrary user URLs */}
      <img
        src={applyMediaTransform(image.url, { width: 480, resize: 'cover', quality: 80 })}
        alt={image.alt ?? ''}
        className="aspect-[4/3] w-full object-cover"
      />
      <form action={removeFormAction} className="p-2">
        <input type="hidden" name="imageId" value={image.id} />
        <button
          type="submit"
          disabled={removing}
          className="w-full rounded-full px-3 py-1.5 text-xs font-medium text-red-600 underline hover:text-red-700 disabled:opacity-50"
        >
          {removing ? es.common.loading : c.remove}
        </button>
      </form>
    </li>
  );
}
