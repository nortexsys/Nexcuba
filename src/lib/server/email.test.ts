import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.fn();

function sentBodyOf(call: unknown): Record<string, string> {
  const init = (call as unknown[])[1] as RequestInit;
  return JSON.parse(init.body as string);
}

describe('sendEmail (Resend REST — dependency D-2)', () => {
  beforeEach(async () => {
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('RESEND_API_KEY', 're_test_key');
    delete process.env.EMAIL_FROM;
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('sends through Resend with the API key and default sender', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200 });
    const { sendEmail } = await import('@/lib/server/email');

    const result = await sendEmail({
      to: 'dest@example.com',
      subject: 'Asunto',
      html: '<p>Hola</p>',
    });

    expect(result).toEqual({ sent: true });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer re_test_key');
    expect(JSON.parse(init.body as string)).toMatchObject({
      from: 'NexCuba <onboarding@resend.dev>',
      to: 'dest@example.com',
      subject: 'Asunto',
      html: '<p>Hola</p>',
    });
  });

  it('uses EMAIL_FROM when configured', async () => {
    process.env.EMAIL_FROM = 'NexCuba <no-reply@nexcuba.org>';
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200 });
    const { sendEmail } = await import('@/lib/server/email');
    await sendEmail({ to: 'x@example.com', subject: 's', html: 'h' });
    expect(sentBodyOf(fetchMock.mock.calls[0]).from).toBe('NexCuba <no-reply@nexcuba.org>');
  });

  it('skips silently (no fetch) when the API key is missing — dev without D-2', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    const { sendEmail } = await import('@/lib/server/email');
    const result = await sendEmail({ to: 'x@example.com', subject: 's', html: 'h' });
    expect(result).toEqual({ sent: false, reason: 'missing-key' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports provider errors without throwing', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'boom' });
    const { sendEmail } = await import('@/lib/server/email');
    const result = await sendEmail({ to: 'x@example.com', subject: 's', html: 'h' });
    expect(result).toEqual({ sent: false, reason: 'provider-error' });
  });

  it('sendApprovalEmail composes subject + html from the template', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200 });
    const { sendApprovalEmail } = await import('@/lib/server/email');
    const result = await sendApprovalEmail('dest@example.com', 'MiDigital SRL');
    expect(result.sent).toBe(true);
    const body = sentBodyOf(fetchMock.mock.calls[0]);
    expect(body.subject).toBe('Tu empresa ya está activa en NexCuba');
    expect(body.html).toContain('MiDigital SRL');
    expect(body.to).toBe('dest@example.com');
  });

  it('sendContactRequestEmail composes the networking notification', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200 });
    const { sendContactRequestEmail } = await import('@/lib/server/email');
    const result = await sendContactRequestEmail('target@example.com', {
      requesterName: 'Café Habana',
      subject: 'Colaboración',
      message: 'Hola',
      targetName: 'MiHotel SRL',
    });
    expect(result.sent).toBe(true);
    const body = sentBodyOf(fetchMock.mock.calls[0]);
    expect(body.to).toBe('target@example.com');
    expect(body.subject).toBe('Nueva solicitud de contacto: Colaboración');
    expect(body.html).toContain('Café Habana');
    expect(body.html).toContain('MiHotel SRL');
  });

  it('sendContactRequestAcceptedEmail composes the acceptance notification', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200 });
    const { sendContactRequestAcceptedEmail } = await import('@/lib/server/email');
    const result = await sendContactRequestAcceptedEmail('requester@example.com', {
      requesterName: 'Café Habana',
      targetName: 'MiHotel SRL',
    });
    expect(result.sent).toBe(true);
    const body = sentBodyOf(fetchMock.mock.calls[0]);
    expect(body.to).toBe('requester@example.com');
    expect(body.subject).toBe('Solicitud de contacto aceptada por MiHotel SRL');
    expect(body.html).toContain('ha aceptado tu solicitud');
  });
});
