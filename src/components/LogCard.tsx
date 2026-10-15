'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Calendar, Check, Clock, Copy, Loader2, Pencil, Trash2, Wind } from 'lucide-react';
import { LogEntry, Session } from '@/types';
import { fmtCompact, fmtDuration, fmtSeconds } from '@/lib/time';
import { sequenceLabels } from '@/lib/sequence';
import { describeActivity } from '@/lib/activity';
import { setShareText } from '@/lib/shareText';

interface LogCardProps {
  log: LogEntry;
  onDelete: (id: string) => void;
  /** Resolves false if the write was rejected. */
  onSaveNotes: (id: string, notes: string) => Promise<boolean>;
  /** History pages already say which day it is, so the card need not repeat it. */
  showDate?: boolean;
}

/** Beyond this many cells the row splits over two lines rather than being squeezed. */
const MAX_CELLS_PER_ROW = 7;

export const LogCard: React.FC<LogCardProps> = ({ log, onDelete, onSaveNotes, showDate = true }) => {
  const date = new Date(log.timestamp);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const trashRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLDivElement>(null);

  // The confirm is a real dialog to keyboards and screen readers too: focus
  // moves to Cancel when it opens (the safer of the two buttons), Escape and
  // an outside click back out of it, and dismissing returns focus to where
  // the journey started.
  useEffect(() => {
    if (!confirmingDelete) return;
    cancelRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setConfirmingDelete(false);
    };
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!confirmRef.current?.contains(target) && !trashRef.current?.contains(target)) {
        setConfirmingDelete(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [confirmingDelete]);

  const cancelDelete = () => {
    setConfirmingDelete(false);
    trashRef.current?.focus();
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Date / time header */}
      <div className="flex justify-between items-center px-4 py-3 border-b border-gray-50 dark:border-slate-800">
        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-slate-400">
          {showDate && (
            <div className="flex items-center gap-1">
              <Calendar size={13} />
              <span>{date.toLocaleDateString()}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Clock size={13} />
            <span>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
        {/* Two taps to delete: this is the only copy of the data, and there is no undo. */}
        {confirmingDelete ? (
          <div ref={confirmRef} className="flex items-center gap-2" role="group" aria-label="Confirm delete">
            <button
              ref={cancelRef}
              onClick={cancelDelete}
              className="text-xs font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 px-2 py-1"
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
          <div className="flex items-center gap-3">
            {log.kind === 'set' && <CopyButton text={setShareText(log)} date={date} />}
            {!editingNotes && (
              <button
                onClick={() => setEditingNotes(true)}
                className="text-gray-300 dark:text-slate-600 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                aria-label={`Edit the notes for the entry from ${date.toLocaleString()}`}
              >
                <Pencil size={15} />
              </button>
            )}
            <button
              ref={trashRef}
              onClick={() => setConfirmingDelete(true)}
              className="text-gray-300 dark:text-slate-600 hover:text-red-400 transition-colors"
              aria-label={`Delete the entry from ${date.toLocaleString()}`}
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      {log.kind === 'set' ? (
        <WorksheetRow log={log} />
      ) : log.kind === 'cp' ? (
        <SingleReading
          label="Control Pause"
          value={fmtSeconds(log.cp)}
          detail={log.activity ? describeActivity(log.activity) : null}
        />
      ) : (
        <SingleReading
          label="Reduced Breathing"
          value={fmtDuration(log.rbDuration)}
          detail={null}
          icon={<Wind size={16} />}
        />
      )}

      {/* Notes */}
      {editingNotes ? (
        <NotesEditor
          initial={log.notes}
          onSave={notes => onSaveNotes(log.id, notes)}
          onClose={() => setEditingNotes(false)}
        />
      ) : log.notes && (
        <div className="px-4 py-2 border-t border-gray-100 dark:border-slate-800 text-xs text-gray-500 dark:text-slate-400 italic md:text-sm">
          {log.notes}
        </div>
      )}
    </div>
  );
};

/** How long the tick stays up after a copy, in ms. */
const COPIED_FEEDBACK_MS = 2000;

/** Copies a set as one line of text, ready to paste into a post. */
function CopyButton({ text, date }: { text: string; date: Date }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      // No clipboard access (permission refused, or not a secure context):
      // the button just stays as it was rather than claiming a copy.
    }
  };

  return (
    <button
      onClick={copy}
      className={`transition-colors ${copied ? 'text-green-500 dark:text-green-400' : 'text-gray-300 dark:text-slate-600 hover:text-blue-500 dark:hover:text-blue-400'}`}
      aria-label={copied ? 'Copied' : `Copy the set from ${date.toLocaleString()} as text`}
      title={copied ? 'Copied' : text}
    >
      {copied ? <Check size={15} /> : <Copy size={15} />}
    </button>
  );
}

interface NotesEditorProps {
  initial: string;
  onSave: (notes: string) => Promise<boolean>;
  onClose: () => void;
}

/** Notes are the one part of an entry worth revisiting once the moment has passed. */
function NotesEditor({ initial, onSave, onClose }: NotesEditorProps) {
  const [draft, setDraft] = useState(initial);
  const [isSaving, setIsSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const save = async () => {
    const notes = draft.trim();
    if (notes === initial) return onClose();
    setIsSaving(true);
    const ok = await onSave(notes);
    setIsSaving(false);
    // A rejected write keeps the editor open, so the typing is not lost.
    if (ok) onClose();
    else setFailed(true);
  };

  return (
    <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-800">
      <textarea
        aria-label="Notes"
        autoFocus
        className="w-full h-24 p-3 border-2 border-gray-200 dark:border-slate-700 rounded-xl focus:border-blue-500 outline-none resize-none text-sm text-gray-700 dark:text-slate-200 dark:bg-slate-800 md:text-base"
        placeholder="Notes — medication, how you felt…"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === 'Escape') onClose(); }}
      />
      {failed && (
        <p className="text-xs text-red-500 dark:text-red-400 mt-1">Couldn&apos;t save — storage may be full.</p>
      )}
      <div className="flex justify-end gap-2 mt-2">
        <button
          onClick={onClose}
          className="text-xs font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 px-2 py-1 md:text-sm"
        >
          Cancel
        </button>
        <button
          onClick={save}
          disabled={isSaving}
          className="flex items-center gap-1.5 text-xs font-bold text-white bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 rounded-lg px-3 py-1 disabled:opacity-70 md:text-sm"
        >
          {isSaving && <Loader2 size={12} className="animate-spin" />} Save
        </button>
      </div>
    </div>
  );
}

/** The worksheet row: P / CP / (RB / CP·EP) × n / P, values under their labels. */
function WorksheetRow({ log }: { log: Session }) {
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

  // Sets too long for one row are split over two rather than squeezed; the 1px
  // gaps over a grey backing draw the dividers.
  return (
    <div
      className="grid gap-px bg-gray-100 dark:bg-slate-800"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {cells.map((cell, i) => (
        <div key={i} className="bg-white dark:bg-slate-900 flex flex-col items-center py-2.5 px-1 min-w-0">
          <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-0.5 truncate md:text-xs">
            {cell.label}
          </span>
          <span className={`text-sm font-bold truncate md:text-base ${cell.highlight ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-slate-200'}`}>
            {cell.value}
          </span>
        </div>
      ))}
      {/* Keeps the tail of a wrapped row white rather than showing the backing */}
      {Array.from({ length: fillers }, (_, i) => (
        <div key={`filler-${i}`} className="bg-white dark:bg-slate-900" />
      ))}
    </div>
  );
}

interface SingleReadingProps {
  label: string;
  value: string;
  /** What the reading was taken around, where that was recorded. */
  detail: string | null;
  icon?: React.ReactNode;
}

/**
 * A lone CP or RB has one number to show rather than a row of them, so it is
 * laid out as a reading and its context instead of as a worksheet row.
 */
function SingleReading({ label, value, detail, icon }: SingleReadingProps) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider md:text-xs">
          {icon} {label}
        </p>
        {detail && (
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 truncate first-letter:uppercase md:text-sm">
            {detail}
          </p>
        )}
      </div>
      <span className="text-2xl font-mono font-bold tabular-nums text-blue-600 dark:text-blue-400 shrink-0 md:text-3xl">
        {value}
      </span>
    </div>
  );
}
