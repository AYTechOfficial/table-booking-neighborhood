export function CoffeeRing({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle cx="42" cy="50" r="30" stroke="#A8431F" strokeWidth="2" />
      <circle cx="58" cy="50" r="30" stroke="#A8431F" strokeWidth="2" opacity="0.6" />
    </svg>
  );
}
