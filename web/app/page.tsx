import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Cell, CellGrid } from '@/components/primitives/CellGrid';
import LabelBar from '@/components/primitives/LabelBar';
import Prose from '@/components/primitives/Prose';

async function LandingPage() {
  const { userId } = await auth();
  if (userId) {
    redirect('/chat');
  }

  return (
    <>
      <Prose>
        <h1 className="font-medium text-[22px] leading-snug">
          A template for web apps built on Claude.
        </h1>
        <p>
          Next.js and FastAPI on Vercel, Supabase for data and files, Clerk for
          auth, and Modal for long-running agents. Three demos exercise every
          part of the stack.
        </p>
        <p>
          <Link href="/sign-up">Sign up</Link> or{' '}
          <Link href="/sign-in">sign in</Link> to try them.
        </p>
      </Prose>
      <LabelBar>Demos</LabelBar>
      <CellGrid>
        <Cell kicker="01" title="Chat">
          Stream replies from Claude with PDFs, images, and text files attached.
        </Cell>
        <Cell kicker="02" title="Agents">
          Configure an agent with tools and run it in the background on Modal.
        </Cell>
        <Cell kicker="03" title="Structured output">
          Get JSON that is guaranteed to match a schema you write.
        </Cell>
      </CellGrid>
    </>
  );
}

export default LandingPage;
