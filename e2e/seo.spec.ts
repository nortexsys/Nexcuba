import { expect, test } from '@playwright/test';

/**
 * SEO surface (H9 §9.1/§9.2). Runs without Supabase configuration: metadata
 * comes from the routes themselves and sitemap degrades to static entries, so
 * these assertions are stable in CI.
 */
test.describe('seo (H9)', () => {
  test('home carries canonical, Open Graph and JSON-LD', async ({ page }) => {
    await page.goto('/');

    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute('href', 'https://nexcuba.org');

    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /NexCuba/);
    await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute(
      'content',
      'NexCuba',
    );

    const jsonLd = page.locator('script[type="application/ld+json"]');
    await expect(jsonLd).toHaveCount(2);
    const organization = await jsonLd.nth(0).textContent();
    expect(JSON.parse(organization ?? '{}')).toMatchObject({ '@type': 'Organization' });
    const website = await jsonLd.nth(1).textContent();
    expect(JSON.parse(website ?? '{}')).toMatchObject({
      '@type': 'WebSite',
      potentialAction: { '@type': 'SearchAction' },
    });
  });

  test('directory exposes canonical and a description', async ({ page }) => {
    await page.goto('/empresas');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://nexcuba.org/empresas',
    );
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /\S/);
  });

  test('search results are marked noindex', async ({ page }) => {
    await page.goto('/buscar?q=acero');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });

  test('sitemap.xml responds and lists the home page', async ({ page }) => {
    const response = await page.request.get('/sitemap.xml');
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain('<loc>https://nexcuba.org</loc>');
    expect(body).toContain('<loc>https://nexcuba.org/empresas</loc>');
  });

  test('robots.txt allows public paths and points to the sitemap', async ({ page }) => {
    const response = await page.goto('/robots.txt');
    expect(response?.status()).toBe(200);
    const body = await page.textContent('body');
    expect(body).toContain('Allow: /');
    expect(body).toContain('Disallow: /portal');
    expect(body).toContain('Sitemap: https://nexcuba.org/sitemap.xml');
  });
});
