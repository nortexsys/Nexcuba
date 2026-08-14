'use client';

import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * Accessible form primitives for the auth flows: label wiring (htmlFor/id),
 * `aria-invalid` + `role="alert"` on errors and hint text. Copy always comes
 * from the locale dictionary (decision D-1).
 */

const inputBase =
  'mt-1 block w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-base text-ink outline-none transition-colors placeholder:text-gray-400 focus:border-ink';
const inputInvalid = 'border-red-600 focus:border-red-600';

interface FieldProps {
  label: string;
  name: string;
  error?: string;
  hint?: string;
}

export function TextInput({
  label,
  name,
  error,
  hint,
  className,
  ...rest
}: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className={className}>
      <FieldShell id={id} label={label} hint={hint} error={error}>
        {(ids) => (
          <input
            id={ids.id}
            name={name}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? ids.errorId : hint ? ids.hintId : undefined}
            className={cn(inputBase, error && inputInvalid)}
            {...rest}
          />
        )}
      </FieldShell>
    </div>
  );
}

export function SelectInput({
  label,
  name,
  error,
  hint,
  className,
  children,
  ...rest
}: FieldProps & SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  const id = useId();
  return (
    <div className={className}>
      <FieldShell id={id} label={label} hint={hint} error={error}>
        {(ids) => (
          <select
            id={ids.id}
            name={name}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? ids.errorId : hint ? ids.hintId : undefined}
            className={cn(inputBase, 'appearance-none', error && inputInvalid)}
            {...rest}
          >
            {children}
          </select>
        )}
      </FieldShell>
    </div>
  );
}

export function TextareaInput({
  label,
  name,
  error,
  hint,
  className,
  ...rest
}: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <div className={className}>
      <FieldShell id={id} label={label} hint={hint} error={error}>
        {(ids) => (
          <textarea
            id={ids.id}
            name={name}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? ids.errorId : hint ? ids.hintId : undefined}
            className={cn(inputBase, 'min-h-24', error && inputInvalid)}
            {...rest}
          />
        )}
      </FieldShell>
    </div>
  );
}

// ── helpers ──

interface FieldShellProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: (ids: { id: string; errorId: string; hintId: string }) => ReactNode;
}

function FieldShell({ id, label, hint, error, children }: FieldShellProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  return (
    <>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      {children({ id, errorId, hintId })}
      {hint && !error && (
        <p id={hintId} className="mt-1 text-xs text-gray-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </>
  );
}

export function FormAlert({ message }: { message: string }) {
  return (
    <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </p>
  );
}

export function SuccessPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-gold bg-cream-50 p-8 text-center">
      <h2 className="text-xl font-bold text-ink">{title}</h2>
      <p className="mt-2 text-base text-gray-700">{body}</p>
    </div>
  );
}
