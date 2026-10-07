import { useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import Thread from './Thread';
import { getOwnerToken } from '../ownerToken';

export default function MessagesDialog({ gift, onClose }) {
  const auth = useMemo(() => ({ ownerToken: gift ? getOwnerToken(gift.id) : '' }), [gift]);

  useEffect(() => {
    if (!gift) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gift, onClose]);

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
            aria-labelledby="messages-title"
            onClick={(e) => e.stopPropagation()}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="relative w-full max-w-md rounded-3xl bg-white px-6 pb-6 pt-7 shadow-[0_24px_60px_-20px_rgba(46,58,89,0.45)]"
          >
            <button type="button" onClick={onClose} className="absolute right-4 top-4 rounded-full p-2 text-tinta-soft hover:bg-nube" aria-label="Cerrar">
              <X size={20} />
            </button>
            <p className="text-sm text-tinta-soft">Conversación con Betania</p>
            <h2 id="messages-title" className="mt-1 pr-8 font-display text-2xl leading-snug">{gift.name}</h2>
            <p className="mt-1 text-sm text-tinta-soft">Solo tú y Betania pueden ver estos mensajes.</p>
            <Thread
              giftId={gift.id}
              viewer="guest"
              auth={auth}
              poll
              names={{ own: 'Tú', other: 'Betania' }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
