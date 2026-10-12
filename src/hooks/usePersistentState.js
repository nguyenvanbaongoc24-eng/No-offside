import { useState, useEffect } from 'react';
import { readStored, writeStored } from '../lib/storage';

export function usePersistentState(key, initial) {
  const [state, setState] = useState(() => typeof initial === 'function' ? initial() : readStored(key, initial));
  useEffect(() => { writeStored(key, state); }, [key, state]);
  useEffect(() => {
    const sync = event => {
      if (event.key === key && event.newValue) {
        try { setState(JSON.parse(event.newValue)); } catch { /* Ignore corrupt external data. */ }
      }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [key]);
  return [state, setState];
}
