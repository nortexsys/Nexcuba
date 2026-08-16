import { expect, test } from '@playwright/test';

/**
 * Negative authorization paths (spec admin-backoffice "acceso no
 * administrador"): unauthenticated visitors never see any admin/portal
 * surface — the middleware redirects before anything renders.
 */
test.describe('auth guards (H3/H4)', () => {
  test('backoffice URLs redirect anonymous visitors to /acceso', async ({ page }) => {
    for (const path of ['/admin', '/admin/solicitudes', '/admin/estadisticas']) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/acceso$/);
      await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
    }
  });

  test('portal URLs redirect anonymous visitors to /acceso', async ({ page }) => {
    await page.goto('/portal');
    await expect(page).toHaveURL(/\/acceso$/);
  });
});
