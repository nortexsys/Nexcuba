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
  /** Per-operation overrides (fall back to mutationError, then error). */
  insertError?: { message: string; code?: string } | null;
  updateError?: { message: string; code?: string } | null;
  deleteError?: { message: string; code?: string } | null;
  /** `count` returned for head-count queries ({ count: 'exact' }). */
  count?: number | null;
}

export interface StorageErrors {
  /** Forced error for storage.upload() in every bucket. */
  uploadError?: { message: string; code?: string } | null;
  /** Forced error for storage.remove() in every bucket. */
  removeError?: { message: string; code?: string } | null;
}

export interface MockCalls {
  inserts: Record<string, Record<string, unknown>[]>;
  updates: Record<string, Record<string, unknown>[]>;
  deletes: Record<string, string[]>;
  eqFilters: Record<string, Record<string, unknown>[]>;
  orFilters: Record<string, string[]>;
  selectColumns: Record<string, unknown[]>;
  /** Storage uploads keyed by bucket: {path, body, options}. */
  storageUploads: Record<string, { path: string; body: unknown; options?: unknown }[]>;
  /** Storage object removals keyed by bucket. */
  storageRemovals: Record<string, string[][]>;
  rpc: ReturnType<typeof vi.fn>;
}

export function makeSupabaseClient(
  tables: Record<string, TableSpec> = {},
  rpcResults: Record<string, unknown> = {},
  storageErrors: StorageErrors = {},
): { client: SupabaseClient; calls: MockCalls } {
  const calls: MockCalls = {
    inserts: {},
    updates: {},
    deletes: {},
    eqFilters: {},
    orFilters: {},
    selectColumns: {},
    storageUploads: {},
    storageRemovals: {},
    rpc: vi.fn(),
  };

  const from = vi.fn((table: string) => {
    const spec = tables[table] ?? {};
    const error = spec.error ?? null;
    const mutationError = spec.mutationError ?? error;
    const insertError = spec.insertError ?? mutationError;
    const updateError = spec.updateError ?? mutationError;
    const deleteError = spec.deleteError ?? mutationError;
    const listResult = {
      data: error ? null : (spec.rows ?? []),
      error,
      count: error ? null : (spec.count ?? null),
    };
    const singleResult = { data: error ? null : (spec.row ?? null), error };

    const chain: Record<string, unknown> = {
      then: <T, R>(
        onFulfilled?: ((value: T) => R | PromiseLike<R>) | null,
        onRejected?: ((reason: unknown) => R | PromiseLike<R>) | null,
      ) => Promise.resolve(listResult).then(onFulfilled as never, onRejected as never),
    };
    for (const method of ['order', 'limit', 'ilike', 'in', 'gt', 'lt', 'is', 'textSearch']) {
      chain[method] = vi.fn(() => chain);
    }
    chain.select = vi.fn((...args: unknown[]) => {
      (calls.selectColumns[table] ??= []).push(args[0]);
      return chain;
    });
    chain.or = vi.fn((expression: string) => {
      (calls.orFilters[table] ??= []).push(expression);
      return chain;
    });
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
      const inserted = Promise.resolve({ data: { id: `${table}-gen-1` }, error: insertError });
      return {
        select: () => ({ single: () => inserted }),
        then: <T, R>(
          onFulfilled?: ((value: T) => R | PromiseLike<R>) | null,
          onRejected?: ((reason: unknown) => R | PromiseLike<R>) | null,
        ) => inserted.then(onFulfilled as never, onRejected as never),
      };
    });

    const mutationResult = (err: { message: string; code?: string } | null) => ({
      data: err ? null : {},
      error: err,
    });
    chain.update = vi.fn((patch: Record<string, unknown>) => {
      (calls.updates[table] ??= []).push(patch);
      const eq = vi.fn((column: string, value: unknown) => {
        (calls.eqFilters[table] ??= []).push({ column, value, update: true });
        return Promise.resolve(mutationResult(updateError));
      });
      return {
        eq,
        is: vi.fn((column: string, value: unknown) => {
          (calls.eqFilters[table] ??= []).push({ column, value, update: true });
          return Promise.resolve(mutationResult(updateError));
        }),
        select: () => chain,
      };
    });

    chain.delete = vi.fn(() => ({
      eq: vi.fn((column: string, value: unknown) => {
        (calls.deletes[table] ??= []).push(String(value));
        (calls.eqFilters[table] ??= []).push({ column, value, delete: true });
        return Promise.resolve(mutationResult(deleteError));
      }),
    }));

    chain.upsert = vi.fn((row: Record<string, unknown>) => {
      (calls.inserts[table] ??= []).push(row);
      return {
        select: () => ({ single: () => Promise.resolve(singleResult) }),
        then: <T, R>(
          onFulfilled?: ((value: T) => R | PromiseLike<R>) | null,
          onRejected?: ((reason: unknown) => R | PromiseLike<R>) | null,
        ) =>
          Promise.resolve(mutationResult(insertError)).then(
            onFulfilled as never,
            onRejected as never,
          ),
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
        upload: vi.fn(async (path: string, body: unknown, options?: unknown) => {
          (calls.storageUploads[bucket] ??= []).push({ path, body, options });
          if (storageErrors.uploadError) return { data: null, error: storageErrors.uploadError };
          return { data: { path }, error: null };
        }),
        remove: vi.fn(async (paths: string[]) => {
          (calls.storageRemovals[bucket] ??= []).push(paths);
          if (storageErrors.removeError) return { data: null, error: storageErrors.removeError };
          return { data: {}, error: null };
        }),
        createSignedUrl: vi.fn(async (path: string, ttl: number) => ({
          data: { signedUrl: `https://signed.example/${bucket}/${path}?ttl=${ttl}` },
          error: null,
        })),
        getPublicUrl: vi.fn((path: string) => ({
          data: { publicUrl: `https://media.example/${bucket}/${path}` },
        })),
      })),
    },
  } as unknown as SupabaseClient;

  return { client, calls };
}
