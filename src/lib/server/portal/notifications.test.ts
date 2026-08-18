import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeSupabaseClient } from '@/test/supabase-mock';
import {
  countUnreadNotifications,
  listNotifications,
  markNotificationsRead,
} from '@/lib/server/portal/notifications';

let h: ReturnType<typeof makeSupabaseClient>;

beforeEach(() => {
  h = makeSupabaseClient({
    notifications: { rows: [], row: null },
  });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('listNotifications (8.3)', () => {
  it('maps rows with payload and read state', async () => {
    h = makeSupabaseClient({
      notifications: {
        rows: [
          {
            id: 'n-1',
            type: 'contact_request_received',
            payload: { request_id: 'req-1' },
            created_at: '2024-01-01T10:00:00Z',
            read_at: null,
          },
          {
            id: 'n-2',
            type: 'contact_request_accepted',
            payload: {},
            created_at: '2024-01-02T10:00:00Z',
            read_at: '2024-01-03T10:00:00Z',
          },
        ],
      },
    });
    const items = await listNotifications(h.client);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      id: 'n-1',
      type: 'contact_request_received',
      payload: { request_id: 'req-1' },
      readAt: null,
    });
    expect(items[1]?.readAt).toBe('2024-01-03T10:00:00Z');
  });

  it('falls back to empty payload/readAt for rows without them', async () => {
    h = makeSupabaseClient({
      notifications: {
        rows: [
          {
            id: 'n-3',
            type: 'contact_request_received',
            payload: null,
            created_at: '2024-01-04T10:00:00Z',
            read_at: null,
          },
        ],
      },
    });
    const items = await listNotifications(h.client);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ id: 'n-3', payload: {}, readAt: null });
  });

  it('orders by created_at descending and degrades to [] on error', async () => {
    const calls = h.calls;
    h = makeSupabaseClient({ notifications: { error: { message: 'boom' } } });
    const items = await listNotifications(h.client);
    expect(items).toEqual([]);
    expect(calls).toBeDefined();
  });
});

describe('countUnreadNotifications (8.3)', () => {
  it('returns the head-count of unread rows', async () => {
    h = makeSupabaseClient({ notifications: { count: 3 } });
    expect(await countUnreadNotifications(h.client)).toBe(3);
  });

  it('defaults to 0 when the count is null', async () => {
    h = makeSupabaseClient({ notifications: { count: null } });
    expect(await countUnreadNotifications(h.client)).toBe(0);
  });

  it('degrades to 0 on error', async () => {
    h = makeSupabaseClient({ notifications: { error: { message: 'boom' } } });
    expect(await countUnreadNotifications(h.client)).toBe(0);
  });
});

describe('markNotificationsRead (8.3)', () => {
  it('sets read_at only on unread rows', async () => {
    const result = await markNotificationsRead(h.client);
    expect(result).toEqual({ ok: true });
    expect(h.calls.updates['notifications']?.[0]).toMatchObject({ read_at: expect.any(String) });
    expect(h.calls.eqFilters['notifications']).toContainEqual({
      column: 'read_at',
      value: null,
      update: true,
    });
  });

  it('surfaces update errors', async () => {
    h = makeSupabaseClient({ notifications: { updateError: { message: 'conflict' } } });
    const result = await markNotificationsRead(h.client);
    expect(result).toEqual({
      ok: false,
      message: 'No se pudieron marcar las notificaciones. Inténtalo de nuevo.',
    });
  });
});
