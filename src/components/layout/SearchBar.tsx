import { es } from '@/locales/es';

/**
 * Global search bar (funcional §12.1 / spec search-discovery): present on every
 * screen, in its own container below the main menu, field centered, exact
 * placeholder. Results wiring lands in milestone H7 (route /buscar).
 */
export function SearchBar() {
  return (
    <section aria-label={es.search.region} className="border-b border-gray-100 bg-cream-100">
      <div className="mx-auto max-w-7xl px-6 py-4">
        <form action="/buscar" method="get" role="search" className="mx-auto w-full max-w-2xl">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 fill-gray-400"
              >
                <path d="M8.5 3a5.5 5.5 0 1 0 3.4 9.8l3.6 3.6a1 1 0 0 0 1.4-1.4l-3.6-3.6A5.5 5.5 0 0 0 8.5 3Zm0 2a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z" />
              </svg>
              <input
                type="search"
                name="q"
                id="global-search"
                placeholder={es.search.placeholder}
                aria-label={es.search.label}
                autoComplete="off"
                className="w-full rounded-full border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-700 placeholder:text-gray-400 focus:border-ink focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
            >
              {es.search.submit}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
