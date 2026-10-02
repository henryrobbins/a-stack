import Link from 'next/link';

/** Three-column grid of hairline-ruled cells; one column below 900px. */
export function CellGrid({ children }: { children: React.ReactNode }) {
  return <div className="cell-grid">{children}</div>;
}

interface CellProps {
  kicker?: React.ReactNode;
  title: React.ReactNode;
  children?: React.ReactNode;
  /** Makes the cell a link that lifts on hover. */
  href?: string;
}

export function Cell({ kicker, title, children, href }: CellProps) {
  const body = (
    <>
      {kicker && <div className="font-mono text-muted text-xs">{kicker}</div>}
      <div className="font-medium">{title}</div>
      {children && (
        <div className="text-muted text-sm leading-normal">{children}</div>
      )}
    </>
  );
  return href ? (
    <Link href={href} className="cell">
      {body}
    </Link>
  ) : (
    <div className="cell">{body}</div>
  );
}
