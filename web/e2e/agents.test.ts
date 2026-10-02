import { createSecretClient } from '@/lib/supabase/secret';
import { expect, test } from './fixtures';

test('create an agent', async ({ page }) => {
  const name = `E2E agent ${Date.now()}`;
  await page.goto('/agents/new');

  await page.getByLabel('Name').fill(name);
  await page.getByLabel(/Calculator/).check();
  await page.getByRole('button', { name: 'Create agent' }).click();

  await expect(page).toHaveURL(/\/agents\/[0-9a-f-]{36}$/);
  await expect(page.getByText(name).first()).toBeVisible();
  await expect(page.getByLabel(/Calculator/)).toBeChecked();

  await createSecretClient().from('agents').delete().eq('name', name);
});
