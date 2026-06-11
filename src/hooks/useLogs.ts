'use client';

import { useState, useEffect } from 'react';
import { LogEntry } from '../types';

export const useLogs = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const savedLogs = localStorage.getItem('buteyko_logs');
    if (savedLogs) {
      try {
        setLogs(JSON.parse(savedLogs));
      } catch (e) {
        console.error('Failed to parse logs', e);
      }
    }
    setIsLoaded(true);
  }, []);

  const saveLog = (newLog: LogEntry) => {
    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);
    localStorage.setItem('buteyko_logs', JSON.stringify(updatedLogs));
  };

  const deleteLog = (id: string) => {
    const updatedLogs = logs.filter(log => log.id !== id);
    setLogs(updatedLogs);
    localStorage.setItem('buteyko_logs', JSON.stringify(updatedLogs));
  };

  return { logs, saveLog, deleteLog, isLoaded };
};
