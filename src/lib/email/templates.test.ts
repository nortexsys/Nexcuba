import { describe, expect, it } from 'vitest';
import { approvalEmail, escapeHtml } from '@/lib/email/templates';

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
