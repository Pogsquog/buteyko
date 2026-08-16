import React from 'react';
import { LogEntry } from '../types';
import { Calendar, Clock, Trash2 } from 'lucide-react';

interface LogCardProps {
  log: LogEntry;
  onDelete: (id: string) => void;
}

function fmtDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (s === 0) return `${m}m`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function fmtCP(seconds: number): string {
  return `${seconds}s`;
}

export const LogCard: React.FC<LogCardProps> = ({ log, onDelete }) => {
  const date = new Date(log.timestamp);

  // P / CP / (RB / CP·EP) × n / P
  const cells = [
    { label: 'P', value: String(log.initialPulse) },
    { label: 'CP', value: fmtCP(log.initialCP), highlight: true },
    ...log.blocks.flatMap(block => [
      { label: 'RB', value: fmtDuration(block.rbDuration) },
      { label: block.pauseType, value: fmtCP(block.pauseValue), highlight: true },
    ]),
    { label: 'P', value: String(log.finalPulse) },
  ];

  // Up to the standard seven cells stay on one line; longer sets split evenly
  // across two so nothing is squeezed to an unreadable width.
  const columns = cells.length <= 7 ? cells.length : Math.ceil(cells.length / 2);
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
        <button
          onClick={() => onDelete(log.id)}
          className="text-gray-300 hover:text-red-400 transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Worksheet row: P / CP / (RB / CP·EP) × n / P.
          Sets too long for one row are split over two rather than squeezed;
          the 1px gaps over a grey backing draw the dividers. */}
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
