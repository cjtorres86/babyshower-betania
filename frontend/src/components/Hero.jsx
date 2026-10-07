import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CalendarHeart, ChevronDown, Clock, MapPin } from 'lucide-react';
import Clothesline from './Clothesline';
import { EVENT } from '../config';

const COLORS = ['#F7B9A1', '#A8D8C8', '#C9B6E4', '#F5D77E'];

const Star = ({ c }) => (
  <svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z" fill={c} /></svg>
);
const Heart = ({ c }) => (
  <svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M12 21s-8-5.2-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 10c0 5.8-8 11-8 11z" fill={c} /></svg>
);
const Dot = ({ c }) => (
  <svg viewBox="0 0 24 24" width="100%" height="100%"><circle cx="12" cy="12" r="10" fill={c} /></svg>
);

// [izquierda %, arriba %, tamaño px, forma, color, duración s, retraso s]
const BITS = [
  [6, 38, 22, Star, 0, 6, 0.2],
  [90, 34, 18, Heart, 1, 7, 0.9],
  [14, 62, 16, Dot, 2, 5.5, 0.5],
  [84, 58, 24, Star, 3, 6.5, 1.3],
  [48, 30, 14, Dot, 1, 8, 0.1],
  [30, 78, 18, Heart, 0, 7.5, 1.6],
  [70, 80, 16, Star, 2, 5, 0.7],
  [94, 82, 14, Dot, 3, 6, 1.1],
];

function FloatingBits() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      {BITS.map(([x, y, size, Shape, color, dur, delay], i) => (
        <motion.span
          key={i}
          className="absolute block"
          style={{ left: `${x}%`, top: `${y}%`, width: size, height: size }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 0.8, 0.5, 0.8], scale: 1, y: [0, -22, 0], x: [0, 8, 0], rotate: [0, 14, -8, 0] }}
          transition={{
            opacity: { duration: dur, repeat: Infinity, delay },
            scale: { type: 'spring', delay: 0.4 + delay * 0.3 },
            y: { duration: dur, repeat: Infinity, ease: 'easeInOut', delay },
            x: { duration: dur, repeat: Infinity, ease: 'easeInOut', delay },
            rotate: { duration: dur, repeat: Infinity, ease: 'easeInOut', delay },
          }}
        >
          <Shape c={COLORS[color]} />
        </motion.span>
      ))}
    </div>
  );
}

function BouncyName({ text, reduce }) {
  return (
    <h1
      aria-label={text}
      className="font-display text-[clamp(3.4rem,min(19vw,14svh),8.5rem)] font-semibold leading-[0.95] tracking-tight"
    >
      {text.split('').map((ch, i) => (
        <motion.span
          key={i}
          aria-hidden="true"
          className="inline-block"
          initial={reduce ? false : { y: 70, opacity: 0, scale: 0.5, rotate: i % 2 ? -14 : 14 }}
          animate={{ y: 0, opacity: 1, scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 9, mass: 0.9, delay: 0.35 + i * 0.08 }}
          whileHover={reduce ? undefined : { y: -10, rotate: i % 2 ? -6 : 6 }}
          whileTap={reduce ? undefined : { scale: 1.15, rotate: i % 2 ? -10 : 10 }}
        >
          {ch}
        </motion.span>
      ))}
    </h1>
  );
}

const fadeUp = (reduce, delay) => ({
  initial: reduce ? false : { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: 'easeOut' },
});

export default function Hero({ info }) {
  const reduce = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const goToGifts = () =>
    document.getElementById('regalos')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });

  return (
    <section className="relative flex min-h-[100svh] flex-col overflow-hidden">
      {!reduce && <FloatingBits />}

      <div className="relative z-10 mx-auto w-full max-w-6xl px-2 pt-3 sm:px-6 sm:pt-4">
        <Clothesline />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 items-center px-5 pb-28 sm:px-8">
        <div className="grid w-full gap-5 md:grid-cols-[1.15fr_0.85fr] md:items-end md:gap-10">
          <div>
            <motion.p {...fadeUp(reduce, 0.2)} className="font-display text-xl text-tinta-soft sm:text-3xl">
              Baby shower de
            </motion.p>
            <BouncyName text={EVENT.mom} reduce={reduce} />
            <motion.p
              {...fadeUp(reduce, 1.1)}
              className="mt-3 max-w-[34rem] text-base leading-relaxed text-tinta-soft sm:mt-6 sm:text-lg"
            >
              {EVENT.message}
            </motion.p>
          </div>

          <motion.dl
            initial={reduce ? false : { opacity: 0, y: -40, rotate: -7 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 70, damping: 5, mass: 1.1, delay: 1.2 }}
            style={{ transformOrigin: '50% 0%' }}
            className="tag-shape relative bg-white px-5 pb-5 pt-9 shadow-[0_18px_40px_-24px_rgba(46,58,89,0.5)] sm:px-7 sm:pb-7 sm:pt-11"
          >
            <span className="absolute left-1/2 top-3.5 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-tinta bg-nube sm:top-4" aria-hidden="true" />
            <div className="flex gap-3">
              <CalendarHeart className="mt-0.5 shrink-0 text-timbre" size={22} aria-hidden="true" />
              <div>
                <dt className="sr-only">Fecha</dt>
                <dd className="font-display text-lg sm:text-xl">{info.label}</dd>
                {info.countdown && <dd className="text-tinta-soft">{info.countdown}</dd>}
              </div>
            </div>
            <div className="mt-3 flex gap-3 sm:mt-4">
              <Clock className="mt-0.5 shrink-0 text-timbre" size={22} aria-hidden="true" />
              <div>
                <dt className="sr-only">Hora</dt>
                <dd className="font-semibold">{EVENT.timeLabel}</dd>
              </div>
            </div>
            <div className="mt-3 flex gap-3 sm:mt-4">
              <MapPin className="mt-0.5 shrink-0 text-timbre" size={22} aria-hidden="true" />
              <div>
                <dt className="sr-only">Lugar</dt>
                <dd className="font-semibold">
                  {EVENT.mapsUrl ? (
                    <a href={EVENT.mapsUrl} target="_blank" rel="noreferrer" className="underline decoration-2 underline-offset-4">
                      {EVENT.place}
                    </a>
                  ) : (
                    EVENT.place
                  )}
                </dd>
                {EVENT.placeDetail && <dd className="text-tinta-soft">{EVENT.placeDetail}</dd>}
              </div>
            </div>
          </motion.dl>
        </div>
      </header>

      {/* Flecha para bajar a la lista */}
      <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center sm:bottom-6">
        <motion.button
          type="button"
          onClick={goToGifts}
          aria-label="Ver la lista de regalos"
          tabIndex={scrolled ? -1 : 0}
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: scrolled ? 0 : 1, y: 0 }}
          transition={{ delay: scrolled ? 0 : 1.9, duration: 0.5 }}
          className={`flex flex-col items-center gap-2 ${scrolled ? 'pointer-events-none' : 'pointer-events-auto'}`}
        >
          <span className="rounded-full bg-white/85 px-4 py-1.5 text-sm font-bold text-tinta shadow-sm">
            Desliza y elige tu regalo 🎁
          </span>
          <motion.span
            animate={reduce ? undefined : { y: [0, 9, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            className="grid h-12 w-12 place-items-center rounded-full bg-tinta text-white shadow-md"
          >
            <ChevronDown size={26} aria-hidden="true" />
          </motion.span>
        </motion.button>
      </div>
    </section>
  );
}
