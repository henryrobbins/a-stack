import { expect, test } from './fixtures';

test('signed-in users land on chat with the app navigation', async ({
  page,
}) => {
  await page.goto('/');

  await expect(page).toHaveURL(/\/chat$/);
  await expect(page.getByRole('link', { name: 'Agents' })).toBeVisible();
});
