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

export interface ContactRequestEmailData {
  requesterName: string;
  subject: string;
  message: string;
  targetName: string;
  inboxUrl?: string;
}

/** A new contact request arrived for the target company (spec networking §8.1). */
export function contactRequestEmail(data: ContactRequestEmailData): ComposedEmail {
  const requester = escapeHtml(data.requesterName);
  const target = escapeHtml(data.targetName);
  const subject = escapeHtml(data.subject);
  const message = escapeHtml(data.message);
  const inboxUrl = escapeHtml(data.inboxUrl ?? 'https://nexcuba.org/portal/contactos');
  return {
    subject: `Nueva solicitud de contacto: ${subject}`,
    html: `<!doctype html>
<html lang="es"><body style="font-family:sans-serif;color:#111827">
  <p>Hola ${target}:</p>
  <p><strong>${requester}</strong> te ha enviado una solicitud de contacto
  a través de NexCuba.</p>
  <p><strong>${subject}</strong></p>
  <p>${message}</p>
  <p>Para responder, entra en <a href="${inboxUrl}">tu bandeja de contactos</a>.</p>
  <p>Un saludo,<br>Equipo NexCuba</p>
</body></html>`,
  };
}

export interface ContactRequestAcceptedEmailData {
  requesterName: string;
  targetName: string;
  contactsUrl?: string;
}

/** The target accepted the request (spec networking §8.2). */
export function contactRequestAcceptedEmail(data: ContactRequestAcceptedEmailData): ComposedEmail {
  const requester = escapeHtml(data.requesterName);
  const target = escapeHtml(data.targetName);
  const contactsUrl = escapeHtml(data.contactsUrl ?? 'https://nexcuba.org/portal/contactos');
  return {
    subject: `Solicitud de contacto aceptada por ${target}`,
    html: `<!doctype html>
<html lang="es"><body style="font-family:sans-serif;color:#111827">
  <p>Hola ${requester}:</p>
  <p><strong>${target}</strong> ha aceptado tu solicitud de contacto en NexCuba.
  A partir de ahora ambas empresas figuran en sus listas de contactos.</p>
  <p>Puedes consultar el contacto en <a href="${contactsUrl}">tus contactos</a>.</p>
  <p>Un saludo,<br>Equipo NexCuba</p>
</body></html>`,
  };
}
