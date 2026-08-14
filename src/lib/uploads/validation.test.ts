import { describe, expect, it } from 'vitest';
import {
  DOCUMENT_LIMITS,
  IMAGE_LIMITS,
  detectDocumentMime,
  detectImageMime,
  validateImage,
  validateVerificationDocument,
} from '@/lib/uploads/validation';

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const WEBP = new Uint8Array([
  ...Array.from('RIFF', (c) => c.charCodeAt(0)),
  0x24,
  0x00,
  0x00,
  0x00,
  ...Array.from('WEBP', (c) => c.charCodeAt(0)),
  ...Array.from('VP8 ', (c) => c.charCodeAt(0)),
]);
const GIF = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
const PDF = new Uint8Array([
  ...Array.from('%PDF-1.7', (c) => c.charCodeAt(0)),
  0x0a,
  0x25,
  0xe2,
  0xe3,
]);

describe('magic-byte detection', () => {
  it('recognizes jpeg, png and webp', () => {
    expect(detectImageMime(JPEG)).toBe('image/jpeg');
    expect(detectImageMime(PNG)).toBe('image/png');
    expect(detectImageMime(WEBP)).toBe('image/webp');
  });

  it('rejects unknown image formats (gif) and random bytes', () => {
    expect(detectImageMime(GIF)).toBeNull();
    expect(detectImageMime(new Uint8Array([1, 2, 3, 4]))).toBeNull();
    expect(detectImageMime(new Uint8Array(0))).toBeNull();
  });

  it('recognizes pdf and image documents', () => {
    expect(detectDocumentMime(PDF)).toBe('application/pdf');
    expect(detectDocumentMime(PNG)).toBe('image/png');
    // Detection is format-neutral: webp is detected, but admission is decided
    // by validateVerificationDocument against DOCUMENT_LIMITS.
    expect(detectDocumentMime(WEBP)).toBe('image/webp');
    const result = validateVerificationDocument(WEBP);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('no está admitido');
  });
});

describe('validateImage (spec content-publishing: images only)', () => {
  it('accepts a real jpeg regardless of the declared mime', () => {
    expect(validateImage(JPEG)).toEqual({ ok: true, mime: 'image/jpeg' });
  });

  it('rejects empty files', () => {
    expect(validateImage(new Uint8Array(0)).ok).toBe(false);
  });

  it('rejects files over 5 MB', () => {
    const oversized = new Uint8Array(IMAGE_LIMITS.maxBytes + 1);
    oversized.set(PNG, 0);
    const result = validateImage(oversized);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('5 MB');
  });

  it('rejects gif (format not admitted)', () => {
    const result = validateImage(GIF);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('no está admitido');
  });

  it('caps gallery length at 8 images per element', () => {
    expect(IMAGE_LIMITS.maxCount).toBe(8);
  });
});

describe('validateVerificationDocument (spec company-registration)', () => {
  it('accepts pdf, jpeg and png', () => {
    expect(validateVerificationDocument(PDF)).toEqual({ ok: true, mime: 'application/pdf' });
    expect(validateVerificationDocument(JPEG)).toEqual({ ok: true, mime: 'image/jpeg' });
    expect(validateVerificationDocument(PNG)).toEqual({ ok: true, mime: 'image/png' });
  });

  it('rejects files over 10 MB', () => {
    const oversized = new Uint8Array(DOCUMENT_LIMITS.maxBytes + 1);
    oversized.set(PDF, 0);
    expect(validateVerificationDocument(oversized).ok).toBe(false);
  });

  it('rejects executable-looking content', () => {
    const exe = new Uint8Array([0x4d, 0x5a, 0x90, 0x00]);
    expect(validateVerificationDocument(exe).ok).toBe(false);
  });
});
