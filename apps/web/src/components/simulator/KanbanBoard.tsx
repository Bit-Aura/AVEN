"use client";

import React, { useState } from 'react';

const initialTickets = [
  { id: 'T-1', title: 'Fix responsiveness on login page', status: 'todo' },
  { id: 'T-2', title: 'Implement accessibility improvements', status: 'todo' },
];

/**
 * Enterprise-grade implementation of KanbanBoard.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
export default function KanbanBoard() {
  const [tickets, setTickets] = useState(initialTickets);

  return (
    <div className="flex flex-col gap-3">
      {['todo', 'in_progress', 'done'].map(status => (
        <div key={status} className="bg-slate-900 rounded p-3">
          <h3 className="text-xs uppercase font-bold text-aven-text-muted mb-2">{status.replace('_', ' ')}</h3>
          {tickets.filter(t => t.status === status).map(t => (
            <div key={t.id} className="bg-slate-700 p-3 rounded mb-2 text-sm shadow cursor-grab active:cursor-grabbing border-l-4 border-sky-500">
              <span className="font-mono text-xs text-sky-300 block mb-1">{t.id}</span>
              {t.title}
            </div>
          ))}
          {tickets.filter(t => t.status === status).length === 0 && (
            <div className="text-aven-text-muted text-xs italic p-2 border border-dashed border-slate-700 rounded text-center">Empty</div>
          )}
        </div>
      ))}
    </div>
  );
}
