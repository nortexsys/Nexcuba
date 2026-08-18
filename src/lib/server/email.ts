import {
  approvalEmail,
  contactRequestAcceptedEmail,
  contactRequestEmail,
  type ContactRequestAcceptedEmailData,
  type ContactRequestEmailData,
} from '@/lib/email/templates';

/**
 * Transactional email via the Resend REST API (dependency D-2). Optional by
 * design: without RESEND_API_KEY (local dev, CI) emails are skipped with a
 * warning instead of failing the operation that triggered them.
 */

export interface SendEmailResult {
  sent: boolean;
  reason?: 'missing-key' | 'provider-error';
}

const DEFAULT_FROM = 'NexCuba <onboarding@resend.dev>';

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.length === 0) {
    console.warn('[email] RESEND_API_KEY not set — skipping email to', params.to);
    return { sent: false, reason: 'missing-key' };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? DEFAULT_FROM,
      to: params.to,
      subject: params.subject,
      html: params.html,
    }),
  });

  if (!response.ok) {
    console.error('[email] Resend error', response.status, await response.text().catch(() => ''));
    return { sent: false, reason: 'provider-error' };
  }
  return { sent: true };
}

/** Approval confirmation — best effort by contract (spec only demands the attempt). */
export async function sendApprovalEmail(to: string, companyName: string): Promise<SendEmailResult> {
  const { subject, html } = approvalEmail(companyName);
  return sendEmail({ to, subject, html });
}

/** New contact request — best effort by contract (spec networking §8.1). */
export async function sendContactRequestEmail(
  to: string,
  data: ContactRequestEmailData,
): Promise<SendEmailResult> {
  const { subject, html } = contactRequestEmail(data);
  return sendEmail({ to, subject, html });
}

/** Request accepted — best effort by contract (spec networking §8.2). */
export async function sendContactRequestAcceptedEmail(
  to: string,
  data: ContactRequestAcceptedEmailData,
): Promise<SendEmailResult> {
  const { subject, html } = contactRequestAcceptedEmail(data);
  return sendEmail({ to, subject, html });
}
