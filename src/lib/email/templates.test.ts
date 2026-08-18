import { describe, expect, it } from 'vitest';
import {
  approvalEmail,
  contactRequestAcceptedEmail,
  contactRequestEmail,
  escapeHtml,
} from '@/lib/email/templates';

describe('escapeHtml', () => {
  it('escapes HTML-sensitive characters', () => {
    expect(escapeHtml('a<b>&"c\'')).toBe('a&lt;b&gt;&amp;&quot;c&#39;');
  });
});

describe('approvalEmail (spec company-registration: confirmación automática)', () => {
  it('announces activation and links to the login page in Spanish', () => {
    const email = approvalEmail('MiDigital <SRL>');
    expect(email.subject).toBe('Tu empresa ya está activa en NexCuba');
    expect(email.html).toContain('MiDigital &lt;SRL&gt;');
    expect(email.html).toContain('/acceso');
    expect(email.html).not.toContain('MiDigital <SRL>');
  });
});

describe('contactRequestEmail (spec networking §8.1: aviso de solicitud)', () => {
  it('notifies the target with subject, message and escaped company names', () => {
    const email = contactRequestEmail({
      requesterName: 'Café <Habana>',
      subject: 'Colaboración',
      message: 'Hola, somos tu proveedor ideal.',
      targetName: 'MiHotel SRL',
    });
    expect(email.subject).toBe('Nueva solicitud de contacto: Colaboración');
    expect(email.html).toContain('Café &lt;Habana&gt;');
    expect(email.html).toContain('Hola, somos tu proveedor ideal.');
    expect(email.html).toContain('MiHotel SRL');
    expect(email.html).not.toContain('Café <Habana>');
  });

  it('defaults the inbox link to the portal contactos page', () => {
    const email = contactRequestEmail({
      requesterName: 'A',
      subject: 'S',
      message: 'M',
      targetName: 'B',
    });
    expect(email.html).toContain('/portal/contactos');
  });
});

describe('contactRequestAcceptedEmail (spec networking §8.2: aceptación)', () => {
  it('informs the requester that the target accepted', () => {
    const email = contactRequestAcceptedEmail({
      requesterName: 'Café Habana',
      targetName: 'MiHotel SRL',
    });
    expect(email.subject).toBe('Solicitud de contacto aceptada por MiHotel SRL');
    expect(email.html).toContain('Café Habana');
    expect(email.html).toContain('MiHotel SRL');
    expect(email.html).toContain('ha aceptado tu solicitud');
  });

  it('escapes company names in the accepted email', () => {
    const email = contactRequestAcceptedEmail({
      requesterName: 'A&B',
      targetName: '<B>',
    });
    expect(email.html).toContain('A&amp;B');
    expect(email.html).toContain('&lt;B&gt;');
    expect(email.html).not.toContain('<B>');
  });
});
