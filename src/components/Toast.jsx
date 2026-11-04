import { useEffect, useState } from 'react';

let listener = null;
export function toast(message, isError = false) {
  if (listener) listener({ message, isError, key: Date.now() });
}

// Lives inside the signed-in layout, so a message can't outlast signing out.
export function ToastHost() {
  const [current, setCurrent] = useState(null);

  useEffect(() => {
    listener = setCurrent;
    return () => { listener = null; };
  }, []);

  useEffect(() => {
    if (!current) return undefined;
    const t = setTimeout(() => setCurrent(null), current.isError ? 6000 : 3000);
    return () => clearTimeout(t);
  }, [current]);

  if (!current) return null;
  return <div className={'toast' + (current.isError ? ' error' : '')} role="status" aria-live="polite">{current.message}</div>;
}
