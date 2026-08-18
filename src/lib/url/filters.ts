/**
 * Pure URL builders for the section filters (task 7.3). Chips and resets are
 * plain <Link>s — no client JS — so every filter state lives in the URL and
 * stays shareable and back-button safe.
 */

export type SearchParamMap = Record<string, string | undefined>;

export interface FilterChip {
  key: string;
  label: string;
  /** href that keeps the current URL but drops exactly this filter. */
  removeHref: string;
}

/**
 * Serializes the given params into a query string for `pathname`, skipping
 * empty/undefined values and optionally dropping the listed keys. Returns the
 * bare path when nothing is left to encode.
 */
export function buildHref(
  pathname: string,
  searchParams: SearchParamMap,
  keysToRemove: string[] = [],
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined || value === '') continue;
    if (keysToRemove.includes(key)) continue;
    search.set(key, value);
  }
  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}

/**
 * Active section filters as removable chips. `labels` maps a param name to its
 * human label (e.g. province name); only params with a non-empty value produce
 * a chip, and each chip's link removes exactly that param.
 */
export function filterChips(params: {
  pathname: string;
  searchParams: SearchParamMap;
  labels: Record<string, (value: string) => string>;
}): FilterChip[] {
  const chips: FilterChip[] = [];
  for (const [key, label] of Object.entries(params.labels)) {
    const value = params.searchParams[key];
    if (value === undefined || value === '') continue;
    chips.push({
      key,
      label: label(value),
      removeHref: buildHref(params.pathname, params.searchParams, [key]),
    });
  }
  return chips;
}
