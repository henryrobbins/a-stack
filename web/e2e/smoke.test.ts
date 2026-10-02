import { expect, test } from '@playwright/test';

test('landing page renders for signed-out visitors', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: /template for web apps/i })
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Sign in' }).first()
  ).toBeVisible();
});

test('protected pages redirect to sign-in', async ({ page }) => {
  await page.goto('/agents/new');

  await expect(page).toHaveURL(/\/sign-in/);
});
