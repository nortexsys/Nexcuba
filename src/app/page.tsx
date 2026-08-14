import { Button } from '@/components/ui/Button';
import { es } from '@/locales/es';

/**
 * Home placeholder for milestone H1 — the real home (stats band, sector cards,
 * featured companies, how-it-works, final CTA) is built in task 5.1.
 * The dark hero follows design-spec §6 from day one.
 */
export default function HomePage() {
  return (
    <>
      <section className="bg-ink-deep">
        <div className="mx-auto max-w-7xl px-6 py-24 text-center">
          <h1 className="mx-auto max-w-4xl text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-7xl lg:leading-[72px]">
            {es.home.heroTitleLine1}
            <br />
            {es.home.heroTitleLine2}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-white/60">{es.home.heroSubtitle}</p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Button variant="light" size="lg" href="/empresas">
              {es.home.heroCta}
            </Button>
            <Button size="lg" href="/registro" className="bg-white/10 text-white hover:bg-white/20">
              {es.home.heroSecondary}
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
