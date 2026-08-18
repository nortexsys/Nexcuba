import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeSupabaseClient } from '@/test/supabase-mock';
import {
  acceptContactRequest,
  listContactInbox,
  sendContactRequest,
} from '@/lib/server/portal/networking';

const ownCompany = {
  id: 'c-1',
  legal_name: 'Café Habana',
  display_name: 'Café Habana',
  entity_type: 'mipyme',
  status: 'approved',
  premium_until: null,
};

const targetCompany = {
  id: 'c-2',
  legal_name: 'MiHotel SRL',
  display_name: 'MiHotel',
  email: 'hotel@example.com',
};

let h: ReturnType<typeof makeSupabaseClient>;
let sendRequestEmail: ReturnType<typeof vi.fn>;
let sendAcceptedEmail: ReturnType<typeof vi.fn>;

beforeEach(() => {
  h = makeSupabaseClient({
    companies: { row: ownCompany, rows: [] },
    contact_requests: { rows: [], row: null },
  });
  sendRequestEmail = vi.fn(async () => ({ sent: true }));
  sendAcceptedEmail = vi.fn(async () => ({ sent: true }));
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('sendContactRequest (8.1)', () => {
  it('validates empty subject and message', async () => {
    expect(
      await sendContactRequest(
        { client: h.client, companyId: 'c-1', sendRequestEmail },
        { targetSlug: 'mihotel', subject: '', message: 'Hola' },
      ),
    ).toEqual({ ok: false, message: 'Escribe un asunto para la solicitud.' });
    expect(
      await sendContactRequest(
        { client: h.client, companyId: 'c-1', sendRequestEmail },
        { targetSlug: 'mihotel', subject: 'Asunto', message: ' ' },
      ),
    ).toEqual({ ok: false, message: 'Escribe un mensaje para la solicitud.' });
  });

  it('enforces subject/message length caps', async () => {
    expect(
      await sendContactRequest(
        { client: h.client, companyId: 'c-1', sendRequestEmail },
        { targetSlug: 'mihotel', subject: 'x'.repeat(121), message: 'ok' },
      ),
    ).toEqual({
      ok: false,
      message: 'El asunto no puede superar los 120 caracteres.',
    });
    expect(
      await sendContactRequest(
        { client: h.client, companyId: 'c-1', sendRequestEmail },
        { targetSlug: 'mihotel', subject: 'ok', message: 'y'.repeat(2001) },
      ),
    ).toEqual({
      ok: false,
      message: 'El mensaje no puede superar los 2000 caracteres.',
    });
  });

  it('blocks a foreign FREE company (no networking right)', async () => {
    h = makeSupabaseClient({
      companies: {
        row: { ...ownCompany, entity_type: 'foreign', premium_until: null },
      },
      contact_requests: { rows: [], row: null },
    });
    const result = await sendContactRequest(
      { client: h.client, companyId: 'c-1', sendRequestEmail },
      { targetSlug: 'mihotel', subject: 'S', message: 'M' },
    );
    expect(result.ok).toBe(false);
    expect(h.calls.inserts['contact_requests']).toBeUndefined();
  });

  it('inserts the request and notifies the target by email', async () => {
    h = makeSupabaseClient({
      companies: { row: ownCompany, rows: [ownCompany] },
      contact_requests: { rows: [], row: null },
    });
    // The target lookup goes through the same companies table: switch the row.
    const lookupClient = makeSupabaseClient({
      companies: { row: targetCompany, rows: [] },
      contact_requests: { rows: [], row: null },
    });
    // Own-company check (id filter) must see the session company, not the target.
    const lookupFrom = lookupClient.client.from as unknown as ReturnType<typeof vi.fn>;
    lookupFrom.mockReturnValueOnce(
      makeSupabaseClient({ companies: { row: ownCompany } }).client.from('companies'),
    );

    const result = await sendContactRequest(
      { client: lookupClient.client, companyId: 'c-1', sendRequestEmail },
      { targetSlug: 'mihotel', subject: 'Colaboración', message: 'Hola' },
    );
    expect(result).toEqual({ ok: true });
    const insert = lookupClient.calls.inserts['contact_requests']?.[0];
    expect(insert).toMatchObject({
      requester_company_id: 'c-1',
      target_company_id: 'c-2',
      subject: 'Colaboración',
      message: 'Hola',
    });
    expect(sendRequestEmail).toHaveBeenCalledWith(
      'hotel@example.com',
      expect.objectContaining({
        requesterName: 'Café Habana',
        subject: 'Colaboración',
        message: 'Hola',
        targetName: 'MiHotel',
      }),
    );
  });

  it('rejects a duplicate pending request', async () => {
    const lookupClient = makeSupabaseClient({
      companies: { row: targetCompany, rows: [] },
      contact_requests: {
        rows: [],
        row: { id: 'req-1' },
        mutationError: { message: 'duplicate key value violates unique constraint' },
      },
    });
    const lookupFrom = lookupClient.client.from as unknown as ReturnType<typeof vi.fn>;
    lookupFrom.mockReturnValueOnce(
      makeSupabaseClient({ companies: { row: ownCompany } }).client.from('companies'),
    );
    const result = await sendContactRequest(
      { client: lookupClient.client, companyId: 'c-1', sendRequestEmail },
      { targetSlug: 'mihotel', subject: 'S', message: 'M' },
    );
    expect(result).toEqual({
      ok: false,
      message: 'Ya tienes una solicitud pendiente hacia esta empresa.',
    });
    expect(lookupClient.calls.inserts['contact_requests']).toBeUndefined();
  });

  it('rejects self-contact and unknown targets', async () => {
    h = makeSupabaseClient({
      companies: { row: ownCompany, rows: [] },
      contact_requests: { rows: [], row: null },
    });
    // companies.row = ownCompany → target lookup resolves to myself.
    const selfResult = await sendContactRequest(
      { client: h.client, companyId: 'c-1', sendRequestEmail },
      { targetSlug: 'cafe', subject: 'S', message: 'M' },
    );
    expect(selfResult).toEqual({
      ok: false,
      message: 'No puedes enviarte una solicitud de contacto a ti misma.',
    });

    h = makeSupabaseClient({
      companies: { row: null, rows: [] },
      contact_requests: { rows: [], row: null },
    });
    // The own-company check must succeed before the target lookup (by slug);
    // serve a valid own row first, then a null target chain.
    const from = h.client.from as unknown as ReturnType<typeof vi.fn>;
    from.mockReturnValueOnce(
      makeSupabaseClient({ companies: { row: ownCompany } }).client.from('companies'),
    );
    const missingResult = await sendContactRequest(
      { client: h.client, companyId: 'c-1', sendRequestEmail },
      { targetSlug: 'no-existe', subject: 'S', message: 'M' },
    );
    expect(missingResult).toEqual({
      ok: false,
      message: 'La empresa receptora no está disponible.',
    });
  });

  it('returns a friendly message when own company read fails', async () => {
    h = makeSupabaseClient({
      companies: { error: { message: 'boom' } },
      contact_requests: { rows: [], row: null },
    });
    const result = await sendContactRequest(
      { client: h.client, companyId: 'c-1', sendRequestEmail },
      { targetSlug: 'mihotel', subject: 'S', message: 'M' },
    );
    expect(result).toEqual({
      ok: false,
      message: 'No se pudo verificar tu plan. Inténtalo de nuevo.',
    });
  });

  it('rejects an empty target slug', async () => {
    const result = await sendContactRequest(
      { client: h.client, companyId: 'c-1', sendRequestEmail },
      { targetSlug: '   ', subject: 'S', message: 'M' },
    );
    expect(result).toEqual({ ok: false, message: 'No se especificó la empresa receptora.' });
  });

  it('handles a target lookup error gracefully', async () => {
    h = makeSupabaseClient({
      companies: { row: null, rows: [], error: { message: 'boom' } },
      contact_requests: { rows: [], row: null },
    });
    const from = h.client.from as unknown as ReturnType<typeof vi.fn>;
    from.mockReturnValueOnce(
      makeSupabaseClient({ companies: { row: ownCompany } }).client.from('companies'),
    );
    const result = await sendContactRequest(
      { client: h.client, companyId: 'c-1', sendRequestEmail },
      { targetSlug: 'mihotel', subject: 'S', message: 'M' },
    );
    expect(result).toEqual({ ok: false, message: 'La empresa receptora no está disponible.' });
  });

  it('surfaces insert errors', async () => {
    const lookupClient = makeSupabaseClient({
      companies: { row: targetCompany, rows: [] },
      contact_requests: { rows: [], row: null, insertError: { message: 'constraint' } },
    });
    const lookupFrom = lookupClient.client.from as unknown as ReturnType<typeof vi.fn>;
    lookupFrom.mockReturnValueOnce(
      makeSupabaseClient({ companies: { row: ownCompany } }).client.from('companies'),
    );
    const result = await sendContactRequest(
      { client: lookupClient.client, companyId: 'c-1', sendRequestEmail },
      { targetSlug: 'mihotel', subject: 'S', message: 'M' },
    );
    expect(result).toEqual({
      ok: false,
      message: 'No se pudo enviar la solicitud. Inténtalo de nuevo.',
    });
  });

  it('proceeds when the duplicate check itself errors', async () => {
    const lookupClient = makeSupabaseClient({
      companies: { row: targetCompany, rows: [] },
      contact_requests: {
        rows: [],
        row: null,
        error: { message: 'boom' },
      },
    });
    const lookupFrom = lookupClient.client.from as unknown as ReturnType<typeof vi.fn>;
    lookupFrom.mockReturnValueOnce(
      makeSupabaseClient({ companies: { row: ownCompany } }).client.from('companies'),
    );
    const result = await sendContactRequest(
      { client: lookupClient.client, companyId: 'c-1', sendRequestEmail },
      { targetSlug: 'mihotel', subject: 'S', message: 'M' },
    );
    // The dup-check error is swallowed (RLS backstop catches duplicates); the
    // insert then fails on the same error.
    expect(result).toEqual({
      ok: false,
      message: 'No se pudo enviar la solicitud. Inténtalo de nuevo.',
    });
    expect(sendRequestEmail).not.toHaveBeenCalled();
  });

  it('sends no email when the target has no address', async () => {
    const noEmail = { ...targetCompany, email: null };
    const lookupClient = makeSupabaseClient({
      companies: { row: noEmail, rows: [] },
      contact_requests: { rows: [], row: null },
    });
    const lookupFrom = lookupClient.client.from as unknown as ReturnType<typeof vi.fn>;
    lookupFrom.mockReturnValueOnce(
      makeSupabaseClient({ companies: { row: ownCompany } }).client.from('companies'),
    );
    const result = await sendContactRequest(
      { client: lookupClient.client, companyId: 'c-1', sendRequestEmail },
      { targetSlug: 'mihotel', subject: 'S', message: 'M' },
    );
    expect(result).toEqual({ ok: true });
    expect(sendRequestEmail).not.toHaveBeenCalled();
  });

  it('falls back to legal_name for the email when display_name is missing', async () => {
    const targetNoDisplay = { ...targetCompany, display_name: null, legal_name: 'MiHotel SRL' };
    const lookupClient = makeSupabaseClient({
      companies: { row: targetNoDisplay, rows: [] },
      contact_requests: { rows: [], row: null },
    });
    const lookupFrom = lookupClient.client.from as unknown as ReturnType<typeof vi.fn>;
    lookupFrom.mockReturnValueOnce(
      makeSupabaseClient({ companies: { row: ownCompany } }).client.from('companies'),
    );
    const result = await sendContactRequest(
      { client: lookupClient.client, companyId: 'c-1', sendRequestEmail },
      { targetSlug: 'mihotel', subject: 'S', message: 'M' },
    );
    expect(result).toEqual({ ok: true });
    expect(sendRequestEmail).toHaveBeenCalledWith(
      'hotel@example.com',
      expect.objectContaining({ targetName: 'MiHotel SRL' }),
    );
  });

  it('uses display_name for the requester name when legal_name is missing', async () => {
    const ownNoLegal = { ...ownCompany, legal_name: null };
    const lookupClient = makeSupabaseClient({
      companies: { row: targetCompany, rows: [] },
      contact_requests: { rows: [], row: null },
    });
    const lookupFrom = lookupClient.client.from as unknown as ReturnType<typeof vi.fn>;
    lookupFrom.mockReturnValueOnce(
      makeSupabaseClient({ companies: { row: ownNoLegal } }).client.from('companies'),
    );
    const result = await sendContactRequest(
      { client: lookupClient.client, companyId: 'c-1', sendRequestEmail },
      { targetSlug: 'mihotel', subject: 'S', message: 'M' },
    );
    expect(result).toEqual({ ok: true });
    expect(sendRequestEmail).toHaveBeenCalledWith(
      'hotel@example.com',
      expect.objectContaining({ requesterName: 'Café Habana' }),
    );
  });

  it('falls back to empty names when both name fields are missing', async () => {
    const ownNoName = { ...ownCompany, legal_name: null, display_name: null };
    const targetNoName = { ...targetCompany, legal_name: null, display_name: null };
    const lookupClient = makeSupabaseClient({
      companies: { row: targetNoName, rows: [] },
      contact_requests: { rows: [], row: null },
    });
    const lookupFrom = lookupClient.client.from as unknown as ReturnType<typeof vi.fn>;
    lookupFrom.mockReturnValueOnce(
      makeSupabaseClient({ companies: { row: ownNoName } }).client.from('companies'),
    );
    const result = await sendContactRequest(
      { client: lookupClient.client, companyId: 'c-1', sendRequestEmail },
      { targetSlug: 'mihotel', subject: 'S', message: 'M' },
    );
    expect(result).toEqual({ ok: true });
    expect(sendRequestEmail).toHaveBeenCalledWith(
      'hotel@example.com',
      expect.objectContaining({ requesterName: '', targetName: '' }),
    );
  });
});

describe('acceptContactRequest (8.2)', () => {
  const pendingRow = {
    id: 'req-1',
    status: 'pending',
    target_company_id: 'c-2',
    requester: { legal_name: 'Café Habana', display_name: null, email: 'cafe@example.com' },
  };

  it('accepts a pending request addressed to me and notifies the requester', async () => {
    h = makeSupabaseClient({
      companies: { row: ownCompany, rows: [] },
      contact_requests: { rows: [], row: pendingRow },
    });
    const result = await acceptContactRequest(
      { client: h.client, companyId: 'c-2', sendAcceptedEmail },
      { requestId: 'req-1' },
    );
    expect(result).toEqual({ ok: true });
    expect(h.calls.updates['contact_requests']?.[0]).toEqual({ status: 'accepted' });
    expect(sendAcceptedEmail).toHaveBeenCalledWith(
      'cafe@example.com',
      expect.objectContaining({ requesterName: 'Café Habana', targetName: 'Café Habana' }),
    );
  });

  it('only the target company can accept', async () => {
    h = makeSupabaseClient({
      companies: { row: ownCompany, rows: [] },
      contact_requests: { rows: [], row: pendingRow },
    });
    const result = await acceptContactRequest(
      { client: h.client, companyId: 'c-3', sendAcceptedEmail },
      { requestId: 'req-1' },
    );
    expect(result).toEqual({
      ok: false,
      message: 'Solo la empresa receptora puede aceptar la solicitud.',
    });
    expect(h.calls.updates['contact_requests']).toBeUndefined();
  });

  it('rejects non-pending requests', async () => {
    h = makeSupabaseClient({
      companies: { row: ownCompany, rows: [] },
      contact_requests: {
        rows: [],
        row: { ...pendingRow, status: 'accepted' },
      },
    });
    const result = await acceptContactRequest(
      { client: h.client, companyId: 'c-2', sendAcceptedEmail },
      { requestId: 'req-1' },
    );
    expect(result).toEqual({ ok: false, message: 'Esta solicitud ya fue gestionada.' });
  });

  it('handles a missing request', async () => {
    h = makeSupabaseClient({
      companies: { row: ownCompany, rows: [] },
      contact_requests: { rows: [], row: null },
    });
    const result = await acceptContactRequest(
      { client: h.client, companyId: 'c-2', sendAcceptedEmail },
      { requestId: 'req-1' },
    );
    expect(result).toEqual({ ok: false, message: 'Solicitud de contacto no encontrada.' });
  });

  it('rejects an empty request id and surfaces lookup errors', async () => {
    const empty = await acceptContactRequest(
      { client: h.client, companyId: 'c-2', sendAcceptedEmail },
      { requestId: '   ' },
    );
    expect(empty).toEqual({ ok: false, message: 'No se especificó la solicitud.' });

    h = makeSupabaseClient({
      companies: { row: ownCompany, rows: [] },
      contact_requests: { rows: [], row: null, error: { message: 'boom' } },
    });
    const lookupError = await acceptContactRequest(
      { client: h.client, companyId: 'c-2', sendAcceptedEmail },
      { requestId: 'req-1' },
    );
    expect(lookupError).toEqual({
      ok: false,
      message: 'No se pudo localizar la solicitud.',
    });
  });

  it('surfaces update errors', async () => {
    h = makeSupabaseClient({
      companies: { row: ownCompany, rows: [] },
      contact_requests: {
        rows: [],
        row: pendingRow,
        updateError: { message: 'conflict' },
      },
    });
    const result = await acceptContactRequest(
      { client: h.client, companyId: 'c-2', sendAcceptedEmail },
      { requestId: 'req-1' },
    );
    expect(result).toEqual({
      ok: false,
      message: 'No se pudo aceptar la solicitud. Inténtalo de nuevo.',
    });
  });

  it('skips the email when the requester has no address', async () => {
    const requesterNoEmail = {
      ...pendingRow,
      requester: { legal_name: 'Café Habana', display_name: null, email: null },
    };
    h = makeSupabaseClient({
      companies: { row: ownCompany, rows: [] },
      contact_requests: { rows: [], row: requesterNoEmail },
    });
    const result = await acceptContactRequest(
      { client: h.client, companyId: 'c-2', sendAcceptedEmail },
      { requestId: 'req-1' },
    );
    expect(result).toEqual({ ok: true });
    expect(sendAcceptedEmail).not.toHaveBeenCalled();
  });

  it('prefers display_name for the requester name when present', async () => {
    const requesterWithDisplay = {
      ...pendingRow,
      requester: { legal_name: 'Café Habana', display_name: 'Café', email: 'cafe@example.com' },
    };
    h = makeSupabaseClient({
      companies: { row: ownCompany, rows: [] },
      contact_requests: { rows: [], row: requesterWithDisplay },
    });
    const result = await acceptContactRequest(
      { client: h.client, companyId: 'c-2', sendAcceptedEmail },
      { requestId: 'req-1' },
    );
    expect(result).toEqual({ ok: true });
    expect(sendAcceptedEmail).toHaveBeenCalledWith(
      'cafe@example.com',
      expect.objectContaining({ requesterName: 'Café' }),
    );
  });

  it('falls back to an empty name when the requester has neither name', async () => {
    const requesterNoName = {
      ...pendingRow,
      requester: { legal_name: null, display_name: null, email: 'cafe@example.com' },
    };
    h = makeSupabaseClient({
      companies: { row: ownCompany, rows: [] },
      contact_requests: { rows: [], row: requesterNoName },
    });
    const result = await acceptContactRequest(
      { client: h.client, companyId: 'c-2', sendAcceptedEmail },
      { requestId: 'req-1' },
    );
    expect(result).toEqual({ ok: true });
    expect(sendAcceptedEmail).toHaveBeenCalledWith(
      'cafe@example.com',
      expect.objectContaining({ requesterName: '' }),
    );
  });

  it('keeps emailing when the target name is derived from display_name or absent', async () => {
    for (const companyRow of [
      { ...ownCompany, display_name: 'Café' },
      { ...ownCompany, legal_name: null, display_name: null },
      null,
    ]) {
      const companies: Record<string, unknown> = {};
      if (companyRow) companies.row = companyRow;
      h = makeSupabaseClient({
        companies: { ...companies, rows: [] },
        contact_requests: { rows: [], row: pendingRow },
      });
      const result = await acceptContactRequest(
        { client: h.client, companyId: 'c-2', sendAcceptedEmail },
        { requestId: 'req-1' },
      );
      expect(result).toEqual({ ok: true });
    }
  });
});

describe('listContactInbox (8.2)', () => {
  it('groups received, sent and established contacts', async () => {
    const receivedRow = {
      id: 'r1',
      subject: 'Propuesta',
      status: 'pending',
      created_at: '2024-01-01',
      accepted_at: null,
      requester: { id: 'c-2', slug: 'mihotel', display_name: 'MiHotel', legal_name: 'MiHotel SRL' },
    };
    const sentRow = {
      id: 's1',
      subject: 'Mi envío',
      status: 'pending',
      created_at: '2024-01-02',
      accepted_at: null,
      target: { id: 'c-2', slug: 'mihotel', display_name: 'MiHotel', legal_name: 'MiHotel SRL' },
    };
    const establishedRow = {
      id: 'e1',
      subject: 'Colaboración',
      status: 'accepted',
      created_at: '2024-01-03',
      accepted_at: '2024-01-04',
      requester: {
        id: 'c-1',
        slug: 'cafe',
        display_name: 'Café Habana',
        legal_name: 'Café Habana',
      },
      target: { id: 'c-2', slug: 'mihotel', display_name: 'MiHotel', legal_name: 'MiHotel SRL' },
    };
    const rowsByCall: Record<string, unknown>[][] = [[receivedRow], [sentRow], [establishedRow]];
    // The inbox issues three list queries against contact_requests: received →
    // sent → established. Serve one result set per call by swapping in chains
    // from dedicated mock clients, in order.
    const base = makeSupabaseClient({});
    const from = base.client.from as unknown as ReturnType<typeof vi.fn>;
    for (const rows of rowsByCall) {
      from.mockReturnValueOnce(
        makeSupabaseClient({ contact_requests: { rows } }).client.from('contact_requests'),
      );
    }

    const inbox = await listContactInbox(base.client, 'c-1');
    expect(inbox.received).toHaveLength(1);
    expect(inbox.received[0]).toMatchObject({
      subject: 'Propuesta',
      counterpart: { name: 'MiHotel', id: 'c-2' },
    });
    expect(inbox.sent).toHaveLength(1);
    expect(inbox.sent[0]).toMatchObject({
      subject: 'Mi envío',
      counterpart: { id: 'c-2' },
    });
    expect(inbox.established).toHaveLength(1);
    expect(inbox.established[0]).toMatchObject({
      subject: 'Colaboración',
      counterpart: { id: 'c-2', name: 'MiHotel' },
    });
  });

  it('degrades to empty lists on errors', async () => {
    h = makeSupabaseClient({
      contact_requests: { error: { message: 'boom' } },
    });
    const inbox = await listContactInbox(h.client, 'c-1');
    expect(inbox).toEqual({ received: [], sent: [], established: [] });
  });

  it('keeps received rows with a missing counterpart relation', async () => {
    // A received row without the requester relation (or an empty array) maps
    // to a null counterpart instead of crashing.
    const orphanRow = {
      id: 'r2',
      subject: 'Sin relación',
      status: 'pending',
      created_at: '2024-01-05',
      accepted_at: null,
      requester: null,
    };
    const base = makeSupabaseClient({});
    const from = base.client.from as unknown as ReturnType<typeof vi.fn>;
    from.mockReturnValueOnce(
      makeSupabaseClient({ contact_requests: { rows: [orphanRow] } }).client.from(
        'contact_requests',
      ),
    );
    const inbox = await listContactInbox(base.client, 'c-1');
    expect(inbox.received).toHaveLength(1);
    expect(inbox.received[0]).toMatchObject({ subject: 'Sin relación', counterpart: null });
  });

  it('picks the target as counterpart when I am the requester', async () => {
    const row = {
      id: 'e2',
      subject: 'Mío',
      status: 'accepted',
      created_at: '2024-01-06',
      accepted_at: '2024-01-07',
      requester: {
        id: 'c-1',
        slug: 'cafe',
        display_name: 'Café Habana',
        legal_name: 'Café Habana',
      },
      target: { id: 'c-2', slug: 'mihotel', display_name: 'MiHotel', legal_name: 'MiHotel SRL' },
    };
    const base = makeSupabaseClient({});
    const from = base.client.from as unknown as ReturnType<typeof vi.fn>;
    from.mockReturnValueOnce(
      makeSupabaseClient({ contact_requests: { rows: [] } }).client.from('contact_requests'),
    );
    from.mockReturnValueOnce(
      makeSupabaseClient({ contact_requests: { rows: [] } }).client.from('contact_requests'),
    );
    from.mockReturnValueOnce(
      makeSupabaseClient({ contact_requests: { rows: [row] } }).client.from('contact_requests'),
    );
    const inbox = await listContactInbox(base.client, 'c-1');
    expect(inbox.established).toHaveLength(1);
    expect(inbox.established[0]).toMatchObject({
      counterpart: { id: 'c-2', slug: 'mihotel', name: 'MiHotel' },
    });
  });

  it('maps an established row with no relations to a null counterpart', async () => {
    const row = {
      id: 'e3',
      subject: 'Huérfana',
      status: 'accepted',
      created_at: '2024-01-08',
      accepted_at: '2024-01-09',
      requester: null,
      target: null,
    };
    const base = makeSupabaseClient({});
    const from = base.client.from as unknown as ReturnType<typeof vi.fn>;
    from.mockReturnValueOnce(
      makeSupabaseClient({ contact_requests: { rows: [] } }).client.from('contact_requests'),
    );
    from.mockReturnValueOnce(
      makeSupabaseClient({ contact_requests: { rows: [] } }).client.from('contact_requests'),
    );
    from.mockReturnValueOnce(
      makeSupabaseClient({ contact_requests: { rows: [row] } }).client.from('contact_requests'),
    );
    const inbox = await listContactInbox(base.client, 'c-1');
    expect(inbox.established).toHaveLength(1);
    expect(inbox.established[0]).toMatchObject({ subject: 'Huérfana', counterpart: null });
  });

  it('keeps a received row whose requester relation is an array', async () => {
    const arrayRelationRow = {
      id: 'r3',
      subject: 'Arreglo',
      status: 'pending',
      created_at: '2024-01-10',
      accepted_at: null,
      requester: [
        { id: 'c-2', slug: 'mihotel', display_name: 'MiHotel', legal_name: 'MiHotel SRL' },
      ],
    };
    const base = makeSupabaseClient({});
    const from = base.client.from as unknown as ReturnType<typeof vi.fn>;
    from.mockReturnValueOnce(
      makeSupabaseClient({ contact_requests: { rows: [arrayRelationRow] } }).client.from(
        'contact_requests',
      ),
    );
    const inbox = await listContactInbox(base.client, 'c-1');
    expect(inbox.received[0]).toMatchObject({
      subject: 'Arreglo',
      counterpart: { id: 'c-2', name: 'MiHotel' },
    });
  });

  it('falls back to legal_name and empty slug for a nameless counterpart', async () => {
    const row = {
      id: 'r4',
      subject: 'Sin marca',
      status: 'pending',
      created_at: '2024-01-11',
      accepted_at: null,
      requester: { id: 'c-2', slug: null, display_name: null, legal_name: 'MiHotel SRL' },
    };
    const base = makeSupabaseClient({});
    const from = base.client.from as unknown as ReturnType<typeof vi.fn>;
    from.mockReturnValueOnce(
      makeSupabaseClient({ contact_requests: { rows: [row] } }).client.from('contact_requests'),
    );
    const inbox = await listContactInbox(base.client, 'c-1');
    expect(inbox.received[0]).toMatchObject({
      counterpart: { id: 'c-2', slug: '', name: 'MiHotel SRL' },
    });
  });

  it('maps established rows with the requester as counterpart and empty accepted_at', async () => {
    const row = {
      id: 'e4',
      subject: 'Desde mí',
      status: 'accepted',
      created_at: '2024-01-12',
      accepted_at: null,
      requester: { id: 'c-2', slug: null, display_name: null, legal_name: 'MiHotel SRL' },
      target: { id: 'c-1', slug: 'cafe', display_name: 'Café Habana', legal_name: 'Café Habana' },
    };
    const base = makeSupabaseClient({});
    const from = base.client.from as unknown as ReturnType<typeof vi.fn>;
    from.mockReturnValueOnce(
      makeSupabaseClient({ contact_requests: { rows: [] } }).client.from('contact_requests'),
    );
    from.mockReturnValueOnce(
      makeSupabaseClient({ contact_requests: { rows: [] } }).client.from('contact_requests'),
    );
    from.mockReturnValueOnce(
      makeSupabaseClient({ contact_requests: { rows: [row] } }).client.from('contact_requests'),
    );
    const inbox = await listContactInbox(base.client, 'c-1');
    expect(inbox.established).toHaveLength(1);
    expect(inbox.established[0]).toMatchObject({
      acceptedAt: null,
      counterpart: { id: 'c-2', slug: '', name: 'MiHotel SRL' },
    });
  });
});
