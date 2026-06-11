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

  // P / CP / RB / CP·EP / RB / CP / P
  const cells = [
    { label: 'P', value: String(log.initialPulse) },
    { label: 'CP', value: fmtCP(log.initialCP), highlight: true },
    { label: 'RB', value: fmtDuration(log.rb1Duration) },
    { label: log.intermediateType, value: fmtCP(log.intermediateValue), highlight: true },
    { label: 'RB', value: fmtDuration(log.rb2Duration) },
    { label: 'CP', value: fmtCP(log.finalCP), highlight: true },
    { label: 'P', value: String(log.finalPulse) },
  ];

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

      {/* Worksheet row: P / CP / RB / CP·EP / RB / CP / P */}
      <div className="flex divide-x divide-gray-100 px-1 py-1">
        {cells.map((cell, i) => (
          <div key={i} className="flex-1 flex flex-col items-center py-2 px-1 min-w-0">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5 truncate md:text-xs">
              {cell.label}
            </span>
            <span className={`text-sm font-bold truncate md:text-base ${cell.highlight ? 'text-blue-600' : 'text-gray-700'}`}>
              {cell.value}
            </span>
          </div>
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
