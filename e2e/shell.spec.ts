import { expect, test } from '@playwright/test';

test.describe('app shell (H1 smoke)', () => {
  test('home shows header, global search bar and footer', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('banner').getByText('NexCuba')).toBeVisible();

    const search = page.getByRole('search');
    await expect(search).toBeVisible();
    await expect(search.getByPlaceholder('Búsqueda general en nexcuba.org')).toBeVisible();

    await expect(page.getByRole('contentinfo')).toBeVisible();
  });

  test('global search submits to /buscar preserving the term', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('Búsqueda general en nexcuba.org').fill('café');
    await page.getByRole('search').getByRole('button', { name: 'Buscar' }).click();
    await expect(page).toHaveURL(/\/buscar\?q=caf%C3%A9/);
    await expect(page.getByText('café')).toBeVisible();
  });

  test('header nav exposes the five public sections', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Principal' });
    for (const label of ['Empresas', 'Productos', 'Servicios', 'Proyectos', 'Oportunidades']) {
      await expect(nav.getByRole('link', { name: label })).toBeVisible();
    }
  });
});
