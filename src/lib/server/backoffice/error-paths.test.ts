import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeSupabaseClient } from '@/test/supabase-mock';
import { getApplicationDetail, listApplications } from '@/lib/server/backoffice/applications';
import {
  activatePremium,
  deactivatePremium,
  getPremiumHistory,
  listCompanies,
} from '@/lib/server/backoffice/companies';
import { listContent, setContentHidden, deleteContent } from '@/lib/server/backoffice/content';
import { getCrmRecord, listCrmRecords, upsertCrmRecord } from '@/lib/server/backoffice/crm';
import { listContactRequests } from '@/lib/server/backoffice/networking';
import { getStatsCounters, getStatsEvolution } from '@/lib/server/backoffice/stats';
import {
  createCategory,
  createSector,
  createTag,
  renameTaxonomy,
  setTaxonomyActive,
} from '@/lib/server/backoffice/taxonomies';

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

const boom = { message: 'boom' };

describe('backoffice error paths (defensive fallbacks)', () => {
  it('applications: list and detail degrade gracefully on errors', async () => {
    const failing = makeSupabaseClient({
      registration_applications: { error: boom },
      verification_documents: { error: boom },
    });
    expect(await listApplications(failing.client, {})).toEqual([]);

    const partial = makeSupabaseClient({
      registration_applications: {
        row: {
          id: 'a-1',
          status: 'pending',
          applicant_name: 'X',
          applicant_email: 'x@x.cu',
          created_at: '2026-01-01',
          payload: null,
          companies: [{ legal_name: 'Array SL', entity_type: 'foreign', id: 'c-1' }],
        },
      },
      verification_documents: { error: boom },
    });
    const detail = await getApplicationDetail(partial.client, 'a-1');
    expect(detail?.documents).toEqual([]);
    expect(detail?.payload).toEqual({});
    expect(detail?.company?.legalName).toBe('Array SL');
  });

  it('companies: list/history/activate/deactivate failures return clean results', async () => {
    const failing = makeSupabaseClient({ companies: { error: boom }, audit_log: { error: boom } });
    expect(await listCompanies(failing.client, {})).toEqual([]);
    expect(await getPremiumHistory(failing.client, 'c-1')).toEqual([]);

    const fetchFail = makeSupabaseClient({ companies: { error: boom } });
    expect(await activatePremium(fetchFail.client, 'u1', 'c-1')).toEqual({
      ok: false,
      message: 'Empresa no encontrada.',
    });

    const updateFail = makeSupabaseClient({
      companies: {
        row: { id: 'c-1', entity_type: 'foreign', status: 'approved', premium_until: null },
        mutationError: boom,
      },
    });
    const activated = await activatePremium(updateFail.client, 'u1', 'c-1');
    expect(activated).toEqual({ ok: false, message: 'No se pudo activar el Premium.' });
    const deactivated = await deactivatePremium(updateFail.client, 'u1', 'c-1');
    expect(deactivated).toEqual({ ok: false, message: 'No se pudo desactivar el Premium.' });
  });

  it('companies: list applies every optional filter', async () => {
    const h = makeSupabaseClient({ companies: { rows: [] } });
    await listCompanies(h.client, {
      status: 'approved',
      entityType: 'foreign',
      featured: false,
      search: 'Café, SRL',
    });
    const filters = h.calls.eqFilters['companies'];
    expect(filters).toContainEqual({ column: 'status', value: 'approved' });
    expect(filters).toContainEqual({ column: 'entity_type', value: 'foreign' });
    expect(filters).toContainEqual({ column: 'is_featured', value: false });
  });

  it('taxonomies: duplicate and generic errors per kind', async () => {
    const duplicate = { code: '23505', message: 'duplicate key' };
    const dupSectors = makeSupabaseClient({ sectors: { error: duplicate } });
    expect(await createSector(dupSectors.client, { name: 'Xyz' })).toEqual({
      ok: false,
      message: 'Ya existe un sector con ese nombre.',
    });
    const dupCategories = makeSupabaseClient({ categories: { error: duplicate } });
    expect(await createCategory(dupCategories.client, { name: 'Xyz', scope: 'product' })).toEqual({
      ok: false,
      message: 'Ya existe una categoría con ese nombre.',
    });
    const dupTags = makeSupabaseClient({ tags: { error: duplicate } });
    expect(await createTag(dupTags.client, { name: 'Xyz' })).toEqual({
      ok: false,
      message: 'Ya existe una etiqueta con ese nombre.',
    });
    const dupRename = makeSupabaseClient({ sectors: { error: duplicate } });
    expect(await renameTaxonomy(dupRename.client, 'sector', 's-1', 'Xyz')).toEqual({
      ok: false,
      message: 'Ya existe un sector con ese nombre.',
    });

    const generic = makeSupabaseClient({
      sectors: { error: boom },
      categories: { error: boom },
      tags: { error: boom },
    });
    expect(await createSector(generic.client, { name: 'Xyz' })).toEqual({
      ok: false,
      message: 'No se pudo guardar la taxonomía. Inténtalo de nuevo.',
    });
    expect(await createCategory(generic.client, { name: 'Xyz', scope: 'service' })).toMatchObject({
      ok: false,
    });
    expect(await createTag(generic.client, { name: 'Xyz' })).toMatchObject({ ok: false });
    expect(await renameTaxonomy(generic.client, 'sector', 's-1', 'Xyz')).toMatchObject({
      ok: false,
    });
    expect(await setTaxonomyActive(generic.client, 'sector', 's-1', false)).toMatchObject({
      ok: false,
    });
    // Invalid category name
    expect(await createCategory(generic.client, { name: '', scope: 'product' })).toEqual({
      ok: false,
      message: 'El nombre es obligatorio.',
    });
  });

  it('content: list filters, error fallbacks and mutation errors', async () => {
    const failing = makeSupabaseClient({ products: { error: boom } });
    expect(await listContent(failing.client, 'products', {})).toEqual([]);

    const h = makeSupabaseClient({
      products: { rows: [], error: null },
      services: {
        rows: [
          {
            id: 's-1',
            name: 'Serv',
            is_hidden: true,
            created_at: '2026-01-01',
            coverage: 'local',
            companies: [{ legal_name: 'A' }],
          },
        ],
      },
      opportunities: {
        rows: [
          {
            id: 'o-1',
            name: 'Opp',
            is_hidden: false,
            created_at: '2026-01-01',
            opportunity_type: 'cliente',
            companies: null,
          },
        ],
      },
    });
    await listContent(h.client, 'products', { hidden: false, search: 'café' });
    expect(h.calls.eqFilters['products']).toContainEqual({ column: 'is_hidden', value: false });

    const services = await listContent(h.client, 'services', {});
    expect(services[0]?.detail).toBe('local');
    expect(services[0]?.companyName).toBe('A');

    const opportunities = await listContent(h.client, 'opportunities', {});
    expect(opportunities[0]?.detail).toBe('cliente');
    expect(opportunities[0]?.companyName).toBe('');

    const mutateFail = makeSupabaseClient({ products: { error: boom, row: null } });
    expect(await setContentHidden(mutateFail.client, 'u1', 'products', 'p-1', true)).toEqual({
      ok: false,
      message: 'No se pudo cambiar la visibilidad del contenido.',
    });
    expect(await deleteContent(mutateFail.client, 'u1', 'products', 'p-1')).toEqual({
      ok: false,
      message: 'No se pudo eliminar el contenido.',
    });
  });

  it('crm: get/list degrade gracefully; upsert generic failure', async () => {
    const failing = makeSupabaseClient({ crm_records: { error: boom } });
    expect(await getCrmRecord(failing.client, 'c-1')).toBeNull();
    expect(await listCrmRecords(failing.client)).toEqual([]);

    const arrayShape = makeSupabaseClient({
      crm_records: {
        rows: [
          {
            company_id: 'c-1',
            has_website: false,
            has_domain: false,
            has_corporate_email: false,
            has_socials: false,
            profile_completeness_snapshot: 0,
            digital_needs: null,
            commercial_potential: 'low',
            followup_status: null,
            notes: null,
            updated_at: '2026-01-01',
            companies: [{ legal_name: 'B', entity_type: 'foreign' }],
          },
        ],
      },
    });
    const rows = await listCrmRecords(arrayShape.client);
    expect(rows[0]?.companyName).toBe('B');

    const upsertFail = makeSupabaseClient({
      companies: { row: { id: 'c-1', profile_completeness: 10 } },
      crm_records: { error: boom },
    });
    expect(
      await upsertCrmRecord(upsertFail.client, 'u1', 'c-1', {
        hasWebsite: false,
        hasDomain: false,
        hasCorporateEmail: false,
        hasSocials: false,
        commercialPotential: 'low',
      }),
    ).toEqual({ ok: false, message: 'No se pudo guardar la ficha CRM.' });
  });

  it('stats: RPC errors yield null / empty series', async () => {
    const failing = makeSupabaseClient(
      {},
      {
        get_stats_counters: { data: null, error: boom },
        get_stats_evolution: { data: null, error: boom },
      },
    );
    expect(await getStatsCounters(failing.client)).toBeNull();
    expect(await getStatsEvolution(failing.client)).toEqual([]);
  });

  it('networking: error fallback and relation shapes', async () => {
    const failing = makeSupabaseClient({ contact_requests: { error: boom } });
    expect(await listContactRequests(failing.client, {})).toEqual([]);

    const shapes = makeSupabaseClient({
      contact_requests: {
        rows: [
          {
            id: 'r-1',
            subject: 'S',
            status: 'pending',
            created_at: '2026-01-01',
            accepted_at: null,
            requester: [{ legal_name: 'Req' }],
            target: null,
          },
        ],
      },
    });
    const rows = await listContactRequests(shapes.client, {});
    expect(rows[0]?.requesterName).toBe('Req');
    expect(rows[0]?.targetName).toBe('');
  });
});
