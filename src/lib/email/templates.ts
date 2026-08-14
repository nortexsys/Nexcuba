/**
 * Transactional email templates (design.md §1 email). Pure functions so the
 * copy is unit-testable; sending lives in src/lib/server/email.ts.
 */

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export interface ComposedEmail {
  subject: string;
  html: string;
}

/** Approval confirmation (funcional §6.2.6 — email automático de confirmación). */
export function approvalEmail(
  companyName: string,
  loginUrl = 'https://nexcuba.org/acceso',
): ComposedEmail {
  const safeName = escapeHtml(companyName);
  const safeUrl = escapeHtml(loginUrl);
  return {
    subject: 'Tu empresa ya está activa en NexCuba',
    html: `<!doctype html>
<html lang="es"><body style="font-family:sans-serif;color:#111827">
  <p>Hola:</p>
  <p>Te informamos que la solicitud de incorporación de <strong>${safeName}</strong>
  a NexCuba ha sido <strong>aprobada</strong>. Tu empresa ya figura en el
  directorio y tu cuenta tiene acceso al área empresarial.</p>
  <p><a href="${safeUrl}">Inicia sesión</a> para completar el perfil de tu empresa
  y empezar a publicar contenido.</p>
  <p>Un saludo,<br>Equipo NexCuba</p>
</body></html>`,
  };
}
