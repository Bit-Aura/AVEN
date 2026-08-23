export default function EmptyState({ message, actionText, onAction }: { message: string, actionText?: string, onAction?: () => void }) {
  return (
    <div className="bg-white border-4 border-black border-dashed p-12 flex flex-col items-center justify-center gap-6 text-center shadow-brutal opacity-80">
      <div className="text-6xl">🕳️</div>
      <h3 className="text-2xl font-black uppercase text-gray-500">Nothing Here Yet</h3>
      <p className="text-lg font-bold max-w-md">{message}</p>
      {actionText && onAction && (
        <button onClick={onAction} className="mt-4 bg-neo-blue text-white font-black uppercase px-6 py-3 border-4 border-black hover:bg-blue-600 transition-colors">
          {actionText}
        </button>
      )}
    </div>
  );
}
