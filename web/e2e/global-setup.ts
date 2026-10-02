import { createClerkClient } from '@clerk/backend';
import { clerkSetup } from '@clerk/testing/playwright';

import { createSecretClient } from '@/lib/supabase/secret';

/**
 * Obtains a Clerk testing token, and makes sure the test user has a `users`
 * row: locally the Clerk webhook cannot reach localhost to create it.
 */
export default async function globalSetup() {
  await clerkSetup();

  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  const { data } = await clerk.users.getUserList({
    emailAddress: [process.env.E2E_TEST_EMAIL!],
  });
  if (data.length === 0) {
    throw new Error(`No Clerk user with email ${process.env.E2E_TEST_EMAIL}`);
  }
  const { error } = await createSecretClient()
    .from('users')
    .upsert(
      { clerk_user_id: data[0].id },
      { onConflict: 'clerk_user_id', ignoreDuplicates: true }
    );
  if (error) {
    throw error;
  }
  process.env.E2E_TEST_USER_ID = data[0].id;
}
