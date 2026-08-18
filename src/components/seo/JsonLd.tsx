/**
 * Renders a JSON-LD payload as a `<script type="application/ld+json">` tag.
 * Pure/SEO concern — lives outside the data layer so it never touches React
 * state. Payloads come from `src/lib/seo/json-ld.ts`.
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}
