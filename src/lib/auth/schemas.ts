import { z } from 'zod';

/**
 * Registration & account zod schemas — spec company-registration. Field names
 * double as FormData keys, so every form input keeps `name` in sync with the
 * schema. Spanish messages are user-facing (decision D-1).
 */

export const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres.')
  .max(72, 'La contraseña no puede superar los 72 caracteres.');

const emailSchema = z
  .string()
  .trim()
  .min(1, 'El email es obligatorio.')
  .email('El email no es válido.');

const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[\d\s()-]{6,25}$/, 'El teléfono no es válido.');

const applicantFirstName = z
  .string()
  .trim()
  .min(2, 'El nombre del solicitante es obligatorio.')
  .max(80, 'Máximo 80 caracteres.');

const applicantLastName = z
  .string()
  .trim()
  .min(2, 'Los apellidos del solicitante son obligatorios.')
  .max(80, 'Máximo 80 caracteres.');

const companyName = z
  .string()
  .trim()
  .min(2, 'El nombre de la empresa es obligatorio.')
  .max(160, 'Máximo 160 caracteres.');

/** Required http(s) URL — two distinct messages so the spec's "missing website"
 *  scenario is distinguishable from a malformed one. */
const websiteSchema = z
  .string()
  .trim()
  .min(1, 'La página web es obligatoria.')
  .refine((value) => /^https?:\/\/.+\..+/.test(value), 'La página web no es válida.');

const territoryId = (label: string) =>
  z.coerce
    .number({ invalid_type_error: `${label} es obligatoria.` })
    .int()
    .positive(`${label} es obligatoria.`);

const passwordConfirmation = {
  password: passwordSchema,
  confirmPassword: z.string(),
} satisfies Record<string, z.ZodTypeAny>;

function withMatchingPassword<S extends z.ZodRawShape>(schema: z.ZodObject<S>) {
  return schema.refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmPassword'],
  });
}

export const cubanRegistrationSchema = withMatchingPassword(
  z.object({
    applicantFirstName,
    applicantLastName,
    email: emailSchema,
    phone: phoneSchema,
    companyName,
    entityType: z.enum(['mipyme', 'cooperative'], {
      errorMap: () => ({ message: 'El tipo de entidad es obligatorio.' }),
    }),
    provinceId: territoryId('La provincia'),
    municipalityId: territoryId('El municipio'),
    address: z.string().trim().min(5, 'La dirección física es obligatoria.'),
    extraIdData: z.string().trim().max(2000, 'Máximo 2000 caracteres.').optional(),
    ...passwordConfirmation,
  }),
);

export const foreignRegistrationSchema = withMatchingPassword(
  z.object({
    applicantFirstName,
    applicantLastName,
    email: emailSchema,
    phone: phoneSchema,
    companyName,
    country: z.string().trim().min(2, 'El país es obligatorio.').max(80, 'Máximo 80 caracteres.'),
    website: websiteSchema,
    ...passwordConfirmation,
  }),
);

export type CubanRegistrationInput = z.infer<typeof cubanRegistrationSchema>;
export type ForeignRegistrationInput = z.infer<typeof foreignRegistrationSchema>;
