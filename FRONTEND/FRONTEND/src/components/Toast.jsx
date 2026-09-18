import { useEffect } from 'react';

export default function Toast({ message, type = 'error', onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [message]);

  if (!message) return null;

  return (
    <div className={`toast toast-${type}`}>
      <span>{type === 'error' ? '❌' : '✅'} {message}</span>
    </div>
  );
}
