interface LabelBarProps {
  children: React.ReactNode;
  /** Right-aligned content, such as a count or an action link. */
  aside?: React.ReactNode;
}

/** Uppercase mono section label between two `line` rules. */
function LabelBar({ children, aside }: LabelBarProps) {
  return (
    <div className="label-bar flex items-baseline justify-between gap-4">
      <h2>{children}</h2>
      {aside}
    </div>
  );
}

export default LabelBar;
