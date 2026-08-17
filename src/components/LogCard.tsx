'use client';

import React, { useState } from 'react';
import { Calendar, Clock, Trash2 } from 'lucide-react';
import { Session } from '@/types';
import { fmtCompact, fmtSeconds } from '@/lib/time';
import { sequenceLabels } from '@/lib/sequence';

interface LogCardProps {
  log: Session;
  onDelete: (id: string) => void;
}

/** Beyond this many cells the row splits over two lines rather than being squeezed. */
const MAX_CELLS_PER_ROW = 7;

export const LogCard: React.FC<LogCardProps> = ({ log, onDelete }) => {
  const date = new Date(log.timestamp);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // P / CP / (RB / CP·EP) × n / P — the same sequence the session was recorded
  // against, paired here with the values.
  const labels = sequenceLabels(log.blocks.length, index => log.blocks[index].pauseType);
  const values = [
    String(log.initialPulse),
    fmtSeconds(log.initialCP),
    ...log.blocks.flatMap(block => [fmtCompact(block.rbDuration), fmtSeconds(block.pauseValue)]),
    String(log.finalPulse),
  ];
  const cells = labels.map((label, i) => ({
    label,
    value: values[i],
    // Pauses are the reading that matters; pulses and RB lengths are context.
    highlight: label === 'CP' || label === 'EP',
  }));

  const columns = cells.length <= MAX_CELLS_PER_ROW ? cells.length : Math.ceil(cells.length / 2);
  const fillers = (columns - (cells.length % columns)) % columns;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Date / time header */}
      <div className="flex justify-between items-center px-4 py-3 border-b border-gray-50">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <Calendar size={13} />
            <span>{date.toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock size={13} />
            <span>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
        {/* Two taps to delete: this is the only copy of the data, and there is no undo. */}
        {confirmingDelete ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setConfirmingDelete(false)}
              className="text-xs font-semibold text-gray-500 hover:text-gray-700 px-2 py-1"
            >
              Cancel
            </button>
            <button
              onClick={() => onDelete(log.id)}
              className="text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg px-2.5 py-1"
            >
              Delete
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmingDelete(true)}
            className="text-gray-300 hover:text-red-400 transition-colors"
            aria-label={`Delete the session from ${date.toLocaleDateString()}`}
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* Worksheet row. Sets too long for one row are split over two rather than
          squeezed; the 1px gaps over a grey backing draw the dividers. */}
      <div
        className="grid gap-px bg-gray-100"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {cells.map((cell, i) => (
          <div key={i} className="bg-white flex flex-col items-center py-2.5 px-1 min-w-0">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5 truncate md:text-xs">
              {cell.label}
            </span>
            <span className={`text-sm font-bold truncate md:text-base ${cell.highlight ? 'text-blue-600' : 'text-gray-700'}`}>
              {cell.value}
            </span>
          </div>
        ))}
        {/* Keeps the tail of a wrapped row white rather than showing the backing */}
        {Array.from({ length: fillers }, (_, i) => (
          <div key={`filler-${i}`} className="bg-white" />
        ))}
      </div>

      {/* Notes */}
      {log.notes && (
        <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-500 italic md:text-sm">
          {log.notes}
        </div>
      )}
    </div>
  );
};
