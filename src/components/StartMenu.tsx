'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CalendarPlus, ChevronUp, Timer, Wind } from 'lucide-react';

interface MenuItem {
  href: string;
  label: string;
  hint: string;
  icon: React.ReactNode;
}

const ITEMS: MenuItem[] = [
  {
    href: '/new-session',
    label: 'Full session',
    hint: 'The whole exercise set, from pulse to pulse',
    icon: <CalendarPlus size={20} />,
  },
  {
    href: '/log-cp',
    label: 'Log CP',
    hint: 'One control pause, on its own',
    icon: <Timer size={20} />,
  },
  {
    href: '/log-rb',
    label: 'Log RB',
    hint: 'Reduced breathing, on its own',
    icon: <Wind size={20} />,
  },
];

/**
 * The bottom half of the home screen's two ways in. The header starts a set
 * straight away; this one asks what kind of thing is being logged, so a lone CP
 * or a lone RB can be recorded without walking through a whole set.
 */
export function StartMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLAnchorElement>(null);

  // Escape and an outside tap close it, and focus moves into the menu when it
  // opens and back to the button when it closes — the same contract a native
  // menu would honour.
  useEffect(() => {
    if (!isOpen) return;
    firstItemRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [isOpen]);

  return (
    <div className="fixed bottom-6 right-6 left-6 max-w-2xl mx-auto z-20">
      {isOpen && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="What to log"
          className="mb-3 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-2xl overflow-hidden"
        >
          {ITEMS.map((item, i) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              ref={i === 0 ? firstItemRef : undefined}
              className="flex items-center gap-3 px-5 py-4 border-b border-gray-50 dark:border-slate-800 last:border-b-0 hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors"
            >
              <span className="text-blue-600 dark:text-blue-400 shrink-0">{item.icon}</span>
              <span className="min-w-0">
                <span className="block font-bold text-gray-800 dark:text-slate-100 md:text-lg">{item.label}</span>
                <span className="block text-xs text-gray-500 dark:text-slate-400 md:text-sm">{item.hint}</span>
              </span>
            </Link>
          ))}
        </div>
      )}

      <button
        ref={buttonRef}
        onClick={() => setIsOpen(open => !open)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="w-full bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-xl flex items-center justify-center gap-2 transition-transform active:scale-95"
      >
        <ChevronUp size={20} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        Log something else
      </button>
    </div>
  );
}
