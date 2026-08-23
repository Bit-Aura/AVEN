export default function Loading() {
  return (
    <div className="min-h-screen bg-neo-bg flex items-center justify-center p-8">
      <div className="bg-neo-yellow border-8 border-black shadow-brutal p-12 flex flex-col items-center gap-6 animate-pulse">
        <h2 className="text-4xl font-black uppercase">Loading...</h2>
        <div className="w-16 h-16 border-8 border-black border-t-neo-blue rounded-full animate-spin"></div>
        <p className="text-xl font-bold">Traversing the knowledge graph.</p>
      </div>
    </div>
  );
}
