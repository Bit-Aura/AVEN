export default function PeerPresenceBadge({ count }: { count: number }) {
  if (count === 0) return null;

  return (
    <div className="inline-flex items-center gap-2 bg-neo-blue text-white px-3 py-1 border-2 border-black font-bold text-sm shadow-brutal-active">
      <span className="relative flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
      </span>
      {count} people on this lesson today
    </div>
  );
}
