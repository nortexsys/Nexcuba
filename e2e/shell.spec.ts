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
    await expect(page.getByRole('heading', { name: 'Resultados de búsqueda' })).toBeVisible();
    await expect(page.getByText('café')).toBeVisible();
  });

  test('header nav exposes the five public sections', async ({ page }) => {
    await page.goto('/');

    // On mobile the nav lives behind the burger menu (Header, H1).
    const burger = page.getByRole('button', { name: 'Abrir menú' });
    const isMobile = await burger.isVisible();
    if (isMobile) await burger.click();

    const nav = page.getByRole('navigation', {
      name: isMobile ? 'Menú de navegación' : 'Principal',
    });
    for (const label of ['Empresas', 'Productos', 'Servicios', 'Proyectos', 'Oportunidades']) {
      await expect(nav.getByRole('link', { name: label })).toBeVisible();
    }
  });
});
