import { clerk } from '@clerk/testing/playwright';
import { test as base } from '@playwright/test';

/** Each test starts signed in as E2E_TEST_EMAIL (ticket sign-in, no UI). */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.goto('/');
    await clerk.signIn({ page, emailAddress: process.env.E2E_TEST_EMAIL! });
    await use(page);
  },
});

export { expect } from '@playwright/test';
