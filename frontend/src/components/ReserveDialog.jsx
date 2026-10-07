import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { X, Loader2 } from 'lucide-react';
import { api } from '../api';

const NAME_KEY = 'bs-betania-name';
const readName = () => {
  try {
    return localStorage.getItem(NAME_KEY) || '';
  } catch {
    return '';
  }
};
const saveName = (n) => {
  try {
    localStorage.setItem(NAME_KEY, n);
  } catch {
    /* sin almacenamiento disponible */
  }
};

function celebrate() {
  const colors = ['#F7B9A1', '#A8D8C8', '#C9B6E4', '#F5D77E', '#ffffff'];
  const opts = { colors, disableForReducedMotion: true, scalar: 1.1 };
  confetti({ ...opts, particleCount: 90, spread: 70, origin: { y: 0.65 } });
  setTimeout(() => confetti({ ...opts, particleCount: 50, angle: 60, spread: 60, origin: { x: 0, y: 0.7 } }), 180);
  setTimeout(() => confetti({ ...opts, particleCount: 50, angle: 120, spread: 60, origin: { x: 1, y: 0.7 } }), 300);
}

export default function ReserveDialog({ gift, onClose, onReserved, onConflict }) {
  const [name, setName] = useState(readName);
  const [guestNote, setGuestNote] = useState('');
  const [status, setStatus] = useState('idle'); // idle | saving | done | error
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (!gift) return;
    setStatus('idle');
    setError('');
    const t = setTimeout(() => inputRef.current?.focus(), 120);
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [gift, onClose]);

  async function submit(e) {
    e.preventDefault();
    const clean = name.trim();
    if (clean.length < 2) {
      setError('Escribe tu nombre para que Betania sepa quién le hace el regalo.');
      return;
    }
    setStatus('saving');
    setError('');
    try {
      const updated = await api.reserve(gift.id, clean, guestNote.trim());
      saveName(clean);
      setStatus('done');
      onReserved(updated);
      celebrate();
    } catch (err) {
      setStatus('error');
      setError(err.message);
      if (err.status === 409 || err.status === 404) onConflict();
    }
  }

  return (
    <AnimatePresence>
      {gift && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-tinta/40 p-4 backdrop-blur-[2px] sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reserve-title"
            onClick={(e) => e.stopPropagation()}
            initial={{ y: 60, rotate: -3, opacity: 0 }}
            animate={{ y: 0, rotate: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="tag-shape relative w-full max-w-md bg-white px-7 pb-7 pt-12 shadow-[0_24px_60px_-20px_rgba(46,58,89,0.45)]"
          >
            <span className="absolute left-1/2 top-4 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-tinta bg-nube" aria-hidden="true" />
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full p-2 text-tinta-soft hover:bg-nube"
              aria-label="Cerrar"
            >
              <X size={20} />
            </button>

            {status === 'done' ? (
              <div className="text-center">
                <p className="font-display text-3xl leading-tight">¡Listo, {name.trim().split(' ')[0]}!</p>
                <p className="mx-auto mt-3 max-w-xs text-tinta-soft">
                  Reservaste <strong className="text-tinta">{gift.name}</strong>. Ya aparece marcado para todos los invitados.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-6 w-full rounded-full bg-tinta px-5 py-3.5 font-bold text-white hover:bg-tinta/90"
                >
                  Volver a la lista
                </button>
              </div>
            ) : (
              <form onSubmit={submit} noValidate>
                <p className="text-sm text-tinta-soft">Vas a reservar</p>
                <h2 id="reserve-title" className="mt-1 font-display text-2xl leading-snug">
                  {gift.name}
                </h2>
                {gift.comment && <p className="mt-2 text-tinta-soft">{gift.comment}</p>}

                <label htmlFor="guest-name" className="mt-6 block font-semibold">
                  Tu nombre
                </label>
                <input
                  id="guest-name"
                  ref={inputRef}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={120}
                  autoComplete="name"
                  placeholder="Ej: Tía Carmen"
                  className="mt-2 w-full rounded-2xl border-2 border-nube-deep bg-nube px-4 py-3 text-lg outline-none transition focus:border-tinta focus:bg-white"
                />
                <p className="mt-2 text-sm text-tinta-soft">Todos verán tu nombre junto al regalo.</p>

                <label htmlFor="guest-note" className="mt-5 block font-semibold">
                  Comentario <span className="font-normal text-tinta-soft">(opcional)</span>
                </label>
                <textarea
                  id="guest-note"
                  value={guestNote}
                  onChange={(e) => setGuestNote(e.target.value)}
                  maxLength={300}
                  rows={3}
                  placeholder="Ej: Lo voy a comprar en verde, ¿está bien?"
                  className="mt-2 w-full resize-none rounded-2xl border-2 border-nube-deep bg-nube px-4 py-3 text-base outline-none transition focus:border-tinta focus:bg-white"
                />

                {error && (
                  <p role="alert" className="mt-4 rounded-xl bg-timbre/10 px-4 py-3 text-[0.95rem] font-semibold text-timbre">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={status === 'saving'}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-tinta px-5 py-3.5 font-bold text-white transition hover:bg-tinta/90 disabled:opacity-70"
                >
                  {status === 'saving' && <Loader2 size={18} className="animate-spin" />}
                  {status === 'saving' ? 'Reservando…' : 'Reservar este regalo'}
                </button>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
