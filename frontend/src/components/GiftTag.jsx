import { motion } from 'framer-motion';

const PAPERS = ['bg-durazno', 'bg-menta', 'bg-lila', 'bg-mantequilla'];

export default function GiftTag({ gift, index, onSelect, justReserved, mine, onOpenThread }) {
  const paper = PAPERS[index % PAPERS.length];
  const reserved = gift.reserved;
  const number = index + 1;

  return (
    <li className="relative w-full">
      <motion.button
        type="button"
        onClick={() => !reserved && onSelect(gift)}
        disabled={reserved}
        aria-label={reserved ? `${gift.name}, reservado por ${gift.reservedBy}` : `Reservar ${gift.name}`}
        whileHover={reserved ? undefined : { y: -3, scale: 1.01 }}
        whileTap={reserved ? undefined : { scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        className={`relative flex w-full flex-col rounded-2xl p-5 text-left shadow-sm transition-shadow hover:shadow-md ${
          reserved ? 'cursor-default bg-white/70 text-tinta-soft' : `${paper} cursor-pointer text-tinta`
        }`}
      >
        {/* Número */}
        <span className={`mb-3 inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
          reserved ? 'bg-tinta/10 text-tinta-soft' : 'bg-tinta/15 text-tinta'
        }`}>
          {number}
        </span>

        <span className={`font-display text-lg leading-snug ${reserved ? 'line-through decoration-2 decoration-tinta/30' : ''}`}>
          {gift.name}
        </span>

        {gift.comment && (
          <span className="mt-1.5 text-sm leading-relaxed opacity-75">{gift.comment}</span>
        )}

        <span className="mt-4">
          {reserved ? (
            <motion.span
              initial={justReserved ? { scale: 2, opacity: 0, rotate: -20 } : false}
              animate={{ scale: 1, opacity: 1, rotate: -4 }}
              transition={{ type: 'spring', stiffness: 380, damping: 16 }}
              className="stamp inline-flex flex-col px-3 py-1.5 leading-tight"
            >
              <span className="font-display text-sm">Reservado</span>
              <span className="text-xs font-semibold">por {gift.reservedBy}</span>
            </motion.span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full bg-tinta px-4 py-2 text-sm font-bold text-white">
              Elegir este regalo
            </span>
          )}
        </span>
      </motion.button>
      {mine && (
        <button
          type="button"
          onClick={() => onOpenThread(gift)}
          className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-tinta px-3.5 py-2 text-sm font-bold text-white shadow-sm hover:bg-tinta/90"
        >
          <span aria-hidden="true">💬</span> Mensajes
        </button>
      )}
    </li>
  );
}
