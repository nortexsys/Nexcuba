import { vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Chainable PostgREST mock for unit-testing server modules that receive an
 * injected SupabaseClient. Records inserts/updates/deletes/rpc calls so tests
 * can assert the exact mutations the backoffice performs.
 */

export interface TableSpec {
  /** Rows returned when the builder is awaited as a list. */
  rows?: Record<string, unknown>[];
  /** Row returned by .single() / .maybeSingle(). */
  row?: Record<string, unknown> | null;
  /** Forced PostgREST-style error for every operation on this table. */
  error?: { message: string; code?: string } | null;
  /** Error only for mutations (insert/update/delete/upsert); reads succeed. */
  mutationError?: { message: string; code?: string } | null;
}

export interface MockCalls {
  inserts: Record<string, Record<string, unknown>[]>;
  updates: Record<string, Record<string, unknown>[]>;
  deletes: Record<string, string[]>;
  eqFilters: Record<string, Record<string, unknown>[]>;
  rpc: ReturnType<typeof vi.fn>;
}

export function makeSupabaseClient(
  tables: Record<string, TableSpec> = {},
  rpcResults: Record<string, unknown> = {},
): { client: SupabaseClient; calls: MockCalls } {
  const calls: MockCalls = { inserts: {}, updates: {}, deletes: {}, eqFilters: {}, rpc: vi.fn() };

  const from = vi.fn((table: string) => {
    const spec = tables[table] ?? {};
    const error = spec.error ?? null;
    const mutationError = spec.mutationError ?? error;
    const listResult = { data: error ? null : (spec.rows ?? []), error };
    const singleResult = { data: error ? null : (spec.row ?? null), error };

    const chain: Record<string, unknown> = {
      then: <T, R>(
        onFulfilled?: ((value: T) => R | PromiseLike<R>) | null,
        onRejected?: ((reason: unknown) => R | PromiseLike<R>) | null,
      ) => Promise.resolve(listResult).then(onFulfilled as never, onRejected as never),
    };
    for (const method of [
      'select',
      'order',
      'limit',
      'or',
      'ilike',
      'in',
      'gt',
      'lt',
      'is',
      'textSearch',
    ]) {
      chain[method] = vi.fn(() => chain);
    }
    for (const method of ['eq', 'neq']) {
      chain[method] = vi.fn((column: string, value: unknown) => {
        (calls.eqFilters[table] ??= []).push({ column, value });
        return chain;
      });
    }
    chain.single = vi.fn(async () => singleResult);
    chain.maybeSingle = vi.fn(async () => singleResult);

    chain.insert = vi.fn((row: Record<string, unknown>) => {
      (calls.inserts[table] ??= []).push(row);
      const inserted = Promise.resolve({ data: { id: `${table}-gen-1` }, error: mutationError });
      return {
        select: () => ({ single: () => inserted }),
        then: <T, R>(
          onFulfilled?: ((value: T) => R | PromiseLike<R>) | null,
          onRejected?: ((reason: unknown) => R | PromiseLike<R>) | null,
        ) => inserted.then(onFulfilled as never, onRejected as never),
      };
    });

    const mutationResult = () => ({ data: mutationError ? null : {}, error: mutationError });
    chain.update = vi.fn((patch: Record<string, unknown>) => {
      (calls.updates[table] ??= []).push(patch);
      return {
        eq: vi.fn((column: string, value: unknown) => {
          (calls.eqFilters[table] ??= []).push({ column, value, update: true });
          return Promise.resolve(mutationResult());
        }),
        select: () => chain,
      };
    });

    chain.delete = vi.fn(() => ({
      eq: vi.fn((column: string, value: unknown) => {
        (calls.deletes[table] ??= []).push(String(value));
        (calls.eqFilters[table] ??= []).push({ column, value, delete: true });
        return Promise.resolve(mutationResult());
      }),
    }));

    chain.upsert = vi.fn((row: Record<string, unknown>) => {
      (calls.inserts[table] ??= []).push(row);
      return {
        select: () => ({ single: () => Promise.resolve(singleResult) }),
        then: <T, R>(
          onFulfilled?: ((value: T) => R | PromiseLike<R>) | null,
          onRejected?: ((reason: unknown) => R | PromiseLike<R>) | null,
        ) => Promise.resolve(mutationResult()).then(onFulfilled as never, onRejected as never),
      };
    });

    return chain;
  });

  const client = {
    from,
    rpc: calls.rpc.mockImplementation(
      async (fn: string) => rpcResults[fn] ?? { data: null, error: null },
    ),
    storage: {
      from: vi.fn((bucket: string) => ({
        createSignedUrl: vi.fn(async (path: string, ttl: number) => ({
          data: { signedUrl: `https://signed.example/${bucket}/${path}?ttl=${ttl}` },
          error: null,
        })),
      })),
    },
  } as unknown as SupabaseClient;

  return { client, calls };
}
