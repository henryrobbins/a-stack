/** Long-form text at reading measure. */
function Prose({ children }: { children: React.ReactNode }) {
  return <div className="prose max-w-[68ch] px-pad-wide py-9">{children}</div>;
}

export default Prose;
