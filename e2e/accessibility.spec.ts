import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * Accessibility audit (H9 §9.3): WCAG 2.1 A/AA on the public surface. Runs in
 * the degraded state (no Supabase), which still exercises the full shell —
 * header/nav/search/footer landmarks, forms, focus styles and colour contrast.
 */
test.describe('accessibility (H9)', () => {
  const routes = [
    '/',
    '/empresas',
    '/productos',
    '/servicios',
    '/proyectos',
    '/oportunidades',
    '/registro',
    '/acceso',
  ];

  for (const route of routes) {
    test(`no axe violations on ${route}`, async ({ page }) => {
      await page.goto(route);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      expect(
        results.violations.map((v) => `${v.id}: ${v.help}`),
        `axe violations on ${route}`,
      ).toEqual([]);
    });
  }

  test('search box has an accessible label and the form is a landmark', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('searchbox', { name: 'Búsqueda general' })).toBeVisible();
    await expect(page.getByRole('search')).toBeVisible();
  });

  test('a single main landmark per page', async ({ page }) => {
    await page.goto('/empresas');
    await expect(page.locator('main')).toHaveCount(1);
  });
});
