import { expect, test } from '@playwright/test';

/**
 * Performance budget (H9 §9.4): standing in for the Lighthouse ≥90 gate in
 * CI (Lighthouse needs a running Chrome headful; the Playwright run measures
 * the core web vitals instead). Budgets are coarse — LCP ≤3.5s and CLS ≤0.1 —
 * and run on the two busiest public routes.
 */
test.describe('performance budget (H9)', () => {
  const routes = ['/', '/empresas'];

  for (const route of routes) {
    test(`core web vitals within budget on ${route}`, async ({ page }) => {
      await page.addInitScript(() => {
        (window as unknown as { __lcp: number[] }).__lcp = [];
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) {
            (window as unknown as { __lcp: number[] }).__lcp.push(e.startTime);
          }
        }).observe({ type: 'largest-contentful-paint', buffered: true });
      });

      await page.goto(route, { waitUntil: 'load' });

      await page
        .waitForFunction(() => (window as unknown as { __lcp: number[] }).__lcp.length > 0, null, {
          timeout: 5000,
        })
        .catch(() => {});

      const lcp = (await page.evaluate(
        () => (window as unknown as { __lcp: number[] }).__lcp.at(-1) ?? 0,
      )) as number;
      expect(lcp).toBeGreaterThan(0);
      expect(lcp).toBeLessThan(3500);

      const cls = (await page.evaluate(() => {
        return performance.getEntriesByType('layout-shift').reduce((acc, e) => {
          const shift = e as LayoutShift;
          if (!shift.hadRecentInput) acc += shift.value;
          return acc;
        }, 0);
      })) as number;
      expect(cls).toBeLessThan(0.1);
    });
  }
});
