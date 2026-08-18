'use client';

import { useActionState, useEffect, useState } from 'react';
import { initialAdminActionState } from '@/lib/admin/form';
import { applyMediaTransform } from '@/lib/public/queries';
import { es } from '@/locales/es';
import type { PortalAction } from '@/components/portal/ProfileForm';

const c = es.auth.portal.content;
const labels = es.public.content;

export type PortalContentTypeUI = 'products' | 'services' | 'projects' | 'opportunities';

export interface PortalContentItem {
  id: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  coverage: string | null;
  statusLabel: string | null;
  needs: string | null;
  location: string | null;
  opportunityType: string | null;
  createdAt: string;
  tagNames: string[];
  images: { id: string; url: string; alt: string | null }[];
}

export interface ContentManagerProps {
  type: PortalContentTypeUI;
  items: PortalContentItem[];
  categories: { id: string; name: string }[];
  saveAction: PortalAction;
  deleteAction: PortalAction;
  addImageAction: PortalAction;
  removeImageAction: PortalAction;
}

type Editing = { mode: 'new' } | { mode: 'edit'; item: PortalContentItem } | null;

const inputClass =
  'block w-full rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-ink placeholder:text-gray-400 focus:border-ink';
const labelClass = 'grid gap-1 text-xs font-medium text-gray-600';

function detailFor(item: PortalContentItem, type: PortalContentTypeUI): string {
  if (type === 'services') {
    const map = labels.coverage as Record<string, string>;
    return (map[item.coverage ?? ''] ?? item.coverage) || '—';
  }
  if (type === 'projects') return item.statusLabel || '—';
  if (type === 'opportunities') {
    const map = labels.opportunityType as Record<string, string>;
    return (map[item.opportunityType ?? ''] ?? item.opportunityType) || '—';
  }
  return item.tagNames[0] ?? '—';
}

/**
 * Own-content CRUD for one of the four types (task 6.3): list + create/edit
 * form (parametrized per type) + per-item image manager. Actions are injected
 * so the component stays unit-testable without server modules.
 */
export function ContentManager({
  type,
  items,
  categories,
  saveAction,
  deleteAction,
  addImageAction,
  removeImageAction,
}: ContentManagerProps) {
  const [editing, setEditing] = useState<Editing>(null);
  const [saveState, saveFormAction, saving] = useActionState(saveAction, initialAdminActionState);

  useEffect(() => {
    if (saveState.status === 'success') setEditing(null);
  }, [saveState]);

  return (
    <section className="grid gap-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{es.common.resultsCount(items.length)}</p>
        <button
          type="button"
          onClick={() => setEditing({ mode: 'new' })}
          className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
        >
          + {c.new}
        </button>
      </div>

      {saveState.status === 'error' && saveState.message && (
        <p role="alert" className="text-sm text-red-600">
          {saveState.message}
        </p>
      )}
      {saveState.status === 'success' && saveState.message && (
        <p role="status" className="text-sm text-gray-700">
          {saveState.message}
        </p>
      )}

      {editing && (
        <div className="rounded-card border border-gray-100 bg-white p-6">
          <ContentForm
            key={editing.mode === 'edit' ? editing.item.id : 'new'}
            type={type}
            item={editing.mode === 'edit' ? editing.item : null}
            categories={categories}
            saveAction={saveFormAction}
            saving={saving}
            onCancel={() => setEditing(null)}
          />
          {editing.mode === 'edit' && (
            <ContentImages
              type={type}
              item={editing.item}
              addImageAction={addImageAction}
              removeImageAction={removeImageAction}
            />
          )}
        </div>
      )}

      {items.length === 0 ? (
        <p className="rounded-card border border-gray-100 bg-white p-6 text-sm text-gray-500">
          {c.empty}
        </p>
      ) : (
        <ul className="grid gap-4">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-gray-100 bg-white p-4"
            >
              <div className="grid gap-1">
                <p className="font-semibold text-ink">{item.name}</p>
                <p className="text-xs text-gray-500">
                  {detailFor(item, type)} · {new Date(item.createdAt).toLocaleDateString('es-ES')}
                  {item.tagNames.length > 0 && ` · ${item.tagNames.join(', ')}`}
                  {` · ${item.images.length}/8 ${c.form.images.toLowerCase()}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditing({ mode: 'edit', item })}
                  className="rounded-full border border-gray-300 px-4 py-1.5 text-xs font-medium text-ink hover:bg-gray-100"
                >
                  {c.edit}
                </button>
                <DeleteContentForm type={type} id={item.id} deleteAction={deleteAction} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function DeleteContentForm({
  type,
  id,
  deleteAction,
}: {
  type: PortalContentTypeUI;
  id: string;
  deleteAction: PortalAction;
}) {
  const [state, formAction, pending] = useActionState(deleteAction, initialAdminActionState);
  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm(c.confirmDelete)) event.preventDefault();
      }}
    >
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-full px-4 py-1.5 text-xs font-medium text-red-600 underline hover:text-red-700 disabled:opacity-50"
      >
        {c.delete}
      </button>
      {state.status === 'error' && state.message && (
        <p role="alert" className="text-xs text-red-600">
          {state.message}
        </p>
      )}
    </form>
  );
}

interface ContentFormProps {
  type: PortalContentTypeUI;
  item: PortalContentItem | null;
  categories: { id: string; name: string }[];
  saveAction: (formData: FormData) => void;
  saving: boolean;
  onCancel: () => void;
}

function ContentForm({ type, item, categories, saveAction, saving, onCancel }: ContentFormProps) {
  const f = c.form;
  return (
    <form action={saveAction} noValidate className="grid gap-4">
      <input type="hidden" name="type" value={type} />
      {item && <input type="hidden" name="id" value={item.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          {f.name}
          <input
            name="name"
            required
            defaultValue={item?.name ?? ''}
            maxLength={120}
            className={inputClass}
          />
        </label>
        {(type === 'products' || type === 'services') && (
          <label className={labelClass}>
            {f.category}
            <select name="categoryId" defaultValue={item?.categoryId ?? ''} className={inputClass}>
              <option value="">{f.noCategory}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {type === 'services' && (
          <label className={labelClass}>
            {f.coverage}
            <select
              name="coverage"
              defaultValue={item?.coverage ?? 'national'}
              className={inputClass}
            >
              {Object.entries(labels.coverage).map(([value, labelText]) => (
                <option key={value} value={value}>
                  {labelText}
                </option>
              ))}
            </select>
          </label>
        )}
        {type === 'opportunities' && (
          <label className={labelClass}>
            {f.opportunityType}
            <select
              name="opportunityType"
              required
              defaultValue={item?.opportunityType ?? ''}
              className={inputClass}
            >
              <option value="">—</option>
              {Object.entries(labels.opportunityType).map(([value, labelText]) => (
                <option key={value} value={value}>
                  {labelText}
                </option>
              ))}
            </select>
          </label>
        )}
        {type === 'projects' && (
          <>
            <label className={labelClass}>
              {f.statusLabel}
              <input
                name="statusLabel"
                placeholder={f.statusPlaceholder}
                defaultValue={item?.statusLabel ?? ''}
                className={inputClass}
                maxLength={60}
              />
            </label>
            <label className={labelClass}>
              {f.location}
              <input
                name="location"
                defaultValue={item?.location ?? ''}
                className={inputClass}
                maxLength={120}
              />
            </label>
          </>
        )}
      </div>

      {type === 'projects' && (
        <label className={labelClass}>
          {f.needs}
          <textarea
            name="needs"
            placeholder={f.needsPlaceholder}
            defaultValue={item?.needs ?? ''}
            rows={2}
            className={inputClass}
            maxLength={500}
          />
        </label>
      )}

      <label className={labelClass}>
        {f.description}
        <textarea
          name="description"
          defaultValue={item?.description ?? ''}
          rows={4}
          className={inputClass}
          maxLength={2000}
        />
      </label>

      <div>
        <label className={labelClass}>
          {f.tags}
          <input
            name="tags"
            defaultValue={item?.tagNames.join(', ') ?? ''}
            placeholder="cacao, exportación, orgánico"
            className={inputClass}
          />
        </label>
        <p className="mt-1 text-[11px] text-gray-400">{f.tagsHint}</p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-ink px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? f.saving : f.save}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full px-4 py-2 text-sm text-gray-500 underline hover:text-ink"
        >
          {f.cancel}
        </button>
      </div>
    </form>
  );
}

function ContentImages({
  type,
  item,
  addImageAction,
  removeImageAction,
}: {
  type: PortalContentTypeUI;
  item: PortalContentItem;
  addImageAction: PortalAction;
  removeImageAction: PortalAction;
}) {
  const f = c.form;
  const [uploadState, uploadFormAction, uploading] = useActionState(
    addImageAction,
    initialAdminActionState,
  );

  return (
    <section className="mt-6 grid gap-3 border-t border-gray-100 pt-4">
      <p className="text-xs font-medium text-gray-600">
        {f.images} <span className="font-normal text-gray-400">({f.imagesHint})</span>
      </p>
      {item.images.length > 0 && (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {item.images.map((image) => (
            <ContentImageThumb
              key={image.id}
              type={type}
              image={image}
              removeImageAction={removeImageAction}
            />
          ))}
        </ul>
      )}
      <form action={uploadFormAction} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="id" value={item.id} />
        <input
          type="file"
          name="file"
          accept="image/jpeg,image/png,image/webp"
          className="block text-sm text-ink file:mr-3 file:rounded-full file:border-0 file:bg-cream-100 file:px-4 file:py-2 file:text-xs file:font-medium file:text-ink"
        />
        <input
          type="text"
          name="alt"
          placeholder={f.altPlaceholder}
          className={`${inputClass} max-w-xs`}
        />
        <button
          type="submit"
          disabled={uploading || item.images.length >= 8}
          className="rounded-full border border-gray-300 px-5 py-2.5 text-sm font-medium text-ink hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? es.common.loading : f.addImage}
        </button>
      </form>
      {uploadState.status === 'error' && uploadState.message && (
        <p role="alert" className="text-sm text-red-600">
          {uploadState.message}
        </p>
      )}
    </section>
  );
}

function ContentImageThumb({
  type,
  image,
  removeImageAction,
}: {
  type: PortalContentTypeUI;
  image: { id: string; url: string; alt: string | null };
  removeImageAction: PortalAction;
}) {
  const [, removeFormAction, removing] = useActionState(removeImageAction, initialAdminActionState);
  return (
    <li className="overflow-hidden rounded-card border border-gray-100 bg-white">
      {/* eslint-disable-next-line @next/next/no-img-element -- portal manager: arbitrary user URLs */}
      <img
        src={applyMediaTransform(image.url, { width: 480, resize: 'cover', quality: 80 })}
        alt={image.alt ?? ''}
        className="aspect-[4/3] w-full object-cover"
      />
      <form action={removeFormAction} className="p-1">
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="imageId" value={image.id} />
        <button
          type="submit"
          disabled={removing}
          className="w-full rounded-full px-2 py-1 text-[11px] font-medium text-red-600 underline hover:text-red-700 disabled:opacity-50"
        >
          {c.form.removeImage}
        </button>
      </form>
    </li>
  );
}
