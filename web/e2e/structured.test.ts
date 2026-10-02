import { expect, test } from './fixtures';

// Calls Claude through the local API; needs ANTHROPIC_API_KEY in api/.env.
test('run the example structured-output request', async ({ page }) => {
  await page.goto('/structured');

  await page.getByRole('button', { name: 'Run' }).click();

  const output = page.getByTestId('structured-output');
  await expect(output).toBeVisible({ timeout: 60_000 });
  await expect(output).toContainText('Ada');
  await expect(output).toContainText('Enterprise');
});
