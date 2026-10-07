import { motion } from 'framer-motion';

const PAPERS = ['bg-durazno', 'bg-menta', 'bg-lila', 'bg-mantequilla'];
const TILTS = [-1.6, 1.2, -0.6, 1.8, -1.2, 0.8];

export default function GiftTag({ gift, index, onSelect, justReserved }) {
  const paper = PAPERS[index % PAPERS.length];
  const tilt = TILTS[index % TILTS.length];
  const reserved = gift.reserved;

  return (
    <li className="relative pt-7">
      {/* hilo del que cuelga la etiqueta */}
      <svg className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2" width="34" height="50" viewBox="0 0 34 50" aria-hidden="true">
        <path d="M17 0 C 4 10, 30 22, 17 47" fill="none" stroke="#2E3A59" strokeWidth="1.6" strokeLinecap="round" />
      </svg>

      <motion.button
        type="button"
        onClick={() => !reserved && onSelect(gift)}
        disabled={reserved}
        aria-label={reserved ? `${gift.name}, reservado por ${gift.reservedBy}` : `Reservar ${gift.name}`}
        style={{ rotate: tilt, transformOrigin: '50% 0%' }}
        whileHover={reserved ? undefined : { rotate: 0, y: -3 }}
        whileTap={reserved ? undefined : { scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        className={`tag-shape relative flex min-h-44 w-full flex-col px-6 pb-5 pt-11 text-left transition-colors ${
          reserved ? 'cursor-default bg-white/70 text-tinta-soft' : `${paper} cursor-pointer text-tinta`
        }`}
      >
        {/* agujero de la etiqueta */}
        <span
          className="absolute left-1/2 top-4 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-tinta bg-nube"
          aria-hidden="true"
        />

        <span className={`font-display text-xl leading-snug ${reserved ? 'line-through decoration-2 decoration-tinta/30' : ''}`}>
          {gift.name}
        </span>
        {gift.comment && <span className="mt-2 text-[0.95rem] leading-relaxed opacity-80">{gift.comment}</span>}

        <span className="mt-auto pt-5">
          {reserved ? (
            <motion.span
              initial={justReserved ? { scale: 2.2, opacity: 0, rotate: -20 } : false}
              animate={{ scale: 1, opacity: 1, rotate: -6 }}
              transition={{ type: 'spring', stiffness: 380, damping: 16 }}
              className="stamp inline-flex flex-col px-3 py-1.5 leading-tight"
            >
              <span className="font-display text-base">Reservado</span>
              <span className="text-sm font-semibold">por {gift.reservedBy}</span>
            </motion.span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full bg-tinta px-4 py-2 text-sm font-bold text-white">
              Elegir este regalo
            </span>
          )}
        </span>
      </motion.button>
    </li>
  );
}
