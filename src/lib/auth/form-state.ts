import type { ZodError } from 'zod';

/**
 * Shared state contract between server actions and `useActionState` forms:
 * field-level Spanish errors plus one optional general message.
 */
export type FormStatus = 'idle' | 'error' | 'success';

export interface AuthFormState {
  status: FormStatus;
  message?: string;
  fields?: Partial<Record<string, string>>;
}

export const initialAuthFormState: AuthFormState = { status: 'idle' };

/** First zod issue per field path — enough for one message per input. */
export function zodFieldErrors(error: ZodError): NonNullable<AuthFormState['fields']> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    if (!(key in fields)) fields[key] = issue.message;
  }
  return fields;
}
