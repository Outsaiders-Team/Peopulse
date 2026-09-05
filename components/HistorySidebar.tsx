'use client'

export default function HistorySidebar({ 
  history, 
  onSelect 
}: { 
  history: any[], 
  onSelect: (analysis: any) => void 
}) {
  if (history.length === 0) {
    return null
  }

  return (
    <aside className="w-64 bg-gray-50 border-r border-gray-200 h-screen overflow-y-auto p-4 flex-shrink-0">
      <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
        Past Analyses
      </h2>
      <div className="flex flex-col gap-2">
        {history.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item.payload)}
            className="text-left p-3 rounded-md hover:bg-gray-200 transition-colors text-sm"
          >
            <div className="font-medium text-gray-900 truncate">
              {item.payload.filename || 'Untitled Analysis'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {new Date(item.created_at).toLocaleDateString()}
            </div>
          </button>
        ))}
      </div>
    </aside>
  )
}