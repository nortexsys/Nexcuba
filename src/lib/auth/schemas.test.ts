import { describe, expect, it } from 'vitest';
import {
  cubanRegistrationSchema,
  foreignRegistrationSchema,
  passwordSchema,
} from '@/lib/auth/schemas';

const cubanBase = {
  applicantFirstName: 'María',
  applicantLastName: 'Fernández Ruiz',
  email: 'maria@midigital.cu',
  phone: '+53 5 123 4567',
  companyName: 'MiDigital SRL',
  entityType: 'mipyme',
  provinceId: '1',
  municipalityId: '3',
  address: 'Calle 23 #45, Vedado',
  extraIdData: 'Código MIPYME 45-T-1234',
  password: 'contrasena-segura',
  confirmPassword: 'contrasena-segura',
};

const foreignBase = {
  applicantFirstName: 'John',
  applicantLastName: 'Smith',
  email: 'john@acme.com',
  phone: '+1 555 0100',
  companyName: 'Acme Trading Ltd.',
  country: 'España',
  website: 'https://acme-trading.example.com',
  password: 'contrasena-segura',
  confirmPassword: 'contrasena-segura',
};

describe('passwordSchema', () => {
  it('rejects short passwords', () => {
    expect(passwordSchema.safeParse('abc').success).toBe(false);
  });
  it('accepts 8+ characters', () => {
    expect(passwordSchema.safeParse('abcdefgh').success).toBe(true);
  });
});

describe('cubanRegistrationSchema (spec company-registration §registro cubano)', () => {
  it('parses a complete §6.1 application and coerces territory ids', () => {
    const parsed = cubanRegistrationSchema.safeParse(cubanBase);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.provinceId).toBe(1);
      expect(parsed.data.municipalityId).toBe(3);
      expect(parsed.data.entityType).toBe('mipyme');
    }
  });

  it('makes "datos identificativos adicionales" optional', () => {
    const { extraIdData: _omit, ...rest } = cubanBase;
    expect(cubanRegistrationSchema.safeParse(rest).success).toBe(true);
  });

  it.each([
    ['applicantFirstName', '', 'El nombre del solicitante es obligatorio.'],
    ['applicantLastName', '', 'Los apellidos del solicitante son obligatorios.'],
    ['email', 'no-un-email', 'El email no es válido.'],
    ['email', '', 'El email es obligatorio.'],
    ['phone', 'abc', 'El teléfono no es válido.'],
    ['companyName', '', 'El nombre de la empresa es obligatorio.'],
    ['entityType', 'tcp', 'El tipo de entidad es obligatorio.'],
    ['address', '', 'La dirección física es obligatoria.'],
  ])('rejects %s=%j with "%s"', (field, value, message) => {
    const result = cubanRegistrationSchema.safeParse({ ...cubanBase, [field]: value });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === field);
      expect(issue?.message).toBe(message);
    }
  });

  it('rejects an empty province/municipality select (sent as "")', () => {
    const result = cubanRegistrationSchema.safeParse({ ...cubanBase, provinceId: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.find((i) => i.path[0] === 'provinceId')?.message).toBe(
        'La provincia es obligatoria.',
      );
    }
  });

  it('rejects mismatched password confirmation on confirmPassword', () => {
    const result = cubanRegistrationSchema.safeParse({
      ...cubanBase,
      confirmPassword: 'otra-cosa',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.find((i) => i.path[0] === 'confirmPassword')?.message).toBe(
        'Las contraseñas no coinciden.',
      );
    }
  });
});

describe('foreignRegistrationSchema (spec: website required, no document)', () => {
  it('parses a complete foreign application', () => {
    expect(foreignRegistrationSchema.safeParse(foreignBase).success).toBe(true);
  });

  it('blocks submission without a website — "obligatoria"', () => {
    const result = foreignRegistrationSchema.safeParse({ ...foreignBase, website: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.find((i) => i.path[0] === 'website')?.message).toBe(
        'La página web es obligatoria.',
      );
    }
  });

  it('rejects a malformed website — "no es válida"', () => {
    const result = foreignRegistrationSchema.safeParse({ ...foreignBase, website: 'acme.com' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.find((i) => i.path[0] === 'website')?.message).toBe(
        'La página web no es válida.',
      );
    }
  });

  it('requires the country field', () => {
    const result = foreignRegistrationSchema.safeParse({ ...foreignBase, country: '' });
    expect(result.success).toBe(false);
  });
});
