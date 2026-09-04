'use client';

import React from 'react';
import { X } from 'lucide-react';

interface FlowShellProps {
  /** Sits between the close button and the balancing spacer — a step count, usually. */
  heading?: React.ReactNode;
  onClose: () => void;
  /** Drawn between the header and the card: the sequence indicator, where there is one. */
  above?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * The frame every guided flow shares — a full set, a lone CP, a lone RB. One
 * card in the middle of the screen with a way out at the top, so the three read
 * as the same app doing different amounts of work.
 */
export function FlowShell({ heading, onClose, above, footer, children }: FlowShellProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-4 md:p-8">
      <div className="max-w-md mx-auto md:max-w-xl">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={onClose}
            className="p-2 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300"
            aria-label="Close"
          >
            <X size={24} />
          </button>
          <span className="text-sm font-semibold text-gray-500 dark:text-slate-400 md:text-base">{heading}</span>
          <div className="w-10" />
        </div>

        {above}

        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-lg border border-gray-100 dark:border-slate-800 min-h-[380px] flex items-center justify-center md:p-12 md:min-h-[460px]">
          {children}
        </div>

        {footer && <div className="mt-6 flex justify-between items-center gap-4">{footer}</div>}
      </div>
    </div>
  );
}
