/**
 * Upload validation — spec content-publishing (images only in Fase 1) and
 * company-registration (verification docs). Client-declared mime is never
 * trusted: detection is based on magic bytes (design.md §5/§10).
 */

export const IMAGE_LIMITS = {
  maxBytes: 5 * 1024 * 1024, // 5 MB
  maxCount: 8,
  allowedMimes: ['image/jpeg', 'image/png', 'image/webp'] as const,
} as const;

export const DOCUMENT_LIMITS = {
  maxBytes: 10 * 1024 * 1024, // 10 MB
  allowedMimes: ['application/pdf', 'image/jpeg', 'image/png'] as const,
} as const;

export type UploadValidation = { ok: true; mime: string } | { ok: false; error: string };

const magic = (bytes: Uint8Array, offset: number, signature: number[]): boolean =>
  signature.every((byte, index) => bytes[offset + index] === byte);

const ascii = (text: string): number[] => Array.from(text, (char) => char.charCodeAt(0));

/** Detects the image format from magic bytes; null when unrecognized. */
export function detectImageMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && magic(bytes, 0, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (bytes.length >= 4 && magic(bytes, 0, [0x89, 0x50, 0x4e, 0x47])) return 'image/png';
  if (bytes.length >= 12 && magic(bytes, 0, ascii('RIFF')) && magic(bytes, 8, ascii('WEBP'))) {
    return 'image/webp';
  }
  return null;
}

/** Detects PDF (verification documents). */
export function detectDocumentMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 5 && magic(bytes, 0, ascii('%PDF-'))) return 'application/pdf';
  return detectImageMime(bytes);
}

function validate(
  bytes: Uint8Array,
  detect: (bytes: Uint8Array) => string | null,
  limits: { maxBytes: number; allowedMimes: readonly string[] },
  kind: string,
): UploadValidation {
  if (bytes.length === 0) return { ok: false, error: `El ${kind} está vacío.` };
  if (bytes.length > limits.maxBytes) {
    return {
      ok: false,
      error: `El ${kind} supera el máximo de ${Math.floor(limits.maxBytes / (1024 * 1024))} MB.`,
    };
  }
  const detected = detect(bytes);
  if (detected === null) {
    return { ok: false, error: `El formato del ${kind} no está admitido.` };
  }
  if (!limits.allowedMimes.includes(detected)) {
    return { ok: false, error: `El formato ${detected} no está admitido para ${kind}.` };
  }
  return { ok: true, mime: detected };
}

export function validateImage(bytes: Uint8Array): UploadValidation {
  return validate(bytes, detectImageMime, IMAGE_LIMITS, 'archivo de imagen');
}

export function validateVerificationDocument(bytes: Uint8Array): UploadValidation {
  return validate(bytes, detectDocumentMime, DOCUMENT_LIMITS, 'documento de acreditación');
}
