import Link from 'next/link';

interface RowProps {
  title: React.ReactNode;
  /** Secondary line beneath the title. */
  subtitle?: React.ReactNode;
  /** Right-aligned mono metadata, such as a date. */
  meta?: React.ReactNode;
  /** Makes the whole row a link, with a sliding arrow. */
  href?: string;
}

/** A hairline-ruled listing row. */
function Row({ title, subtitle, meta, href }: RowProps) {
  const body = (
    <>
      <div className="min-w-0">
        <div className="row-title truncate">
          {title}
          {href && <span className="row-arrow">→</span>}
        </div>
        {subtitle && (
          <div className="mt-1 truncate text-muted text-sm">{subtitle}</div>
        )}
      </div>
      <div className="row-meta">{meta}</div>
    </>
  );
  return href ? (
    <Link href={href} className="row">
      {body}
    </Link>
  ) : (
    <div className="row">{body}</div>
  );
}

export default Row;
