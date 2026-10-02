import { Show, UserButton } from '@clerk/nextjs';
import Link from 'next/link';

import NavLink from '@/components/shell/NavLink';

const NAV = [
  { href: '/chat', label: 'Chat' },
  { href: '/agents', label: 'Agents' },
  { href: '/structured', label: 'Structured' },
  { href: '/stats', label: 'Stats' },
];

function TopBar() {
  return (
    <header className="border-line border-b">
      <div className="mx-auto flex w-full max-w-[1128px] items-center gap-8 px-pad py-4">
        <Link
          href="/"
          className="font-mono font-semibold text-[15px] uppercase tracking-[0.06em]"
        >
          a-stack
        </Link>
        <Show when="signed-in">
          <nav className="flex flex-1 gap-5 overflow-x-auto font-mono text-sm">
            {NAV.map((item) => (
              <NavLink key={item.href} href={item.href}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <UserButton />
        </Show>
        <Show when="signed-out">
          <div className="flex flex-1 justify-end gap-5 font-mono text-sm">
            <Link href="/sign-in">Sign in</Link>
            <Link href="/sign-up">Sign up</Link>
          </div>
        </Show>
      </div>
    </header>
  );
}

export default TopBar;
