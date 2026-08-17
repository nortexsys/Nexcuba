import { expect, test } from '@playwright/test';

/**
 * Public-area smoke (task 5.x). Runs without Supabase configuration: pages
 * degrade to empty states through safeQuery, so structure/copy is what we
 * assert here — data-dependent paths are covered by unit + SQL tests.
 */
test.describe('public area (H5)', () => {
  test('home keeps the dark hero, stats band and how-it-works', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('empresarial cubano');
    await expect(page.getByText('El ecosistema en números')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Cómo funciona' })).toBeVisible();
  });

  test('directory renders filters and the empty state gracefully', async ({ page }) => {
    await page.goto('/empresas');
    await expect(page.getByRole('heading', { name: 'Empresas', level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Aplicar filtros' })).toBeVisible();
    await expect(page.getByRole('radiogroup')).toBeVisible(); // dual-view toggle (D-5)
  });

  const sections = [
    ['/productos', 'Productos'],
    ['/servicios', 'Servicios'],
    ['/proyectos', 'Proyectos'],
    ['/oportunidades', 'Oportunidades'],
  ] as const;
  for (const [url, title] of sections) {
    test(`content section ${url} renders`, async ({ page }) => {
      await page.goto(url);
      await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible();
      await expect(page.getByRole('radiogroup')).toBeVisible();
    });
  }

  test('unknown company slug yields 404 (thin-page guard)', async ({ page }) => {
    const response = await page.goto('/empresas/esta-empresa-no-existe');
    expect(response?.status()).toBe(404);
  });

  test('unknown sector yields 404', async ({ page }) => {
    const response = await page.goto('/sectores/sector-inexistente');
    expect(response?.status()).toBe(404);
  });
});
