import { motion, useReducedMotion } from 'framer-motion';

// Prendas dibujadas en una caja de 60x60
const Onesie = ({ fill }) => (
  <>
    <path
      d="M18 4 L10 8 L2 18 L10 24 L14 20 L14 46 Q14 54 24 56 L36 56 Q46 54 46 46 L46 20 L50 24 L58 18 L50 8 L42 4 Q30 14 18 4 Z"
      fill={fill}
      stroke="#2E3A59"
      strokeWidth="2.2"
      strokeLinejoin="round"
    />
    <circle cx="26" cy="51" r="1.6" fill="#2E3A59" />
    <circle cx="34" cy="51" r="1.6" fill="#2E3A59" />
    <path d="M24 30 q6 5 12 0" fill="none" stroke="#2E3A59" strokeWidth="2" strokeLinecap="round" />
  </>
);

const Socks = ({ fill }) => (
  <>
    <path d="M8 2 H22 V30 Q22 42 10 42 H6 Q0 42 0 36 Q0 31 6 30 L8 29 Z" fill={fill} stroke="#2E3A59" strokeWidth="2.2" strokeLinejoin="round" />
    <path d="M8 8 H22" stroke="#2E3A59" strokeWidth="2" />
    <path d="M34 2 H48 V30 Q48 42 36 42 H32 Q26 42 26 36 Q26 31 32 30 L34 29 Z" fill={fill} stroke="#2E3A59" strokeWidth="2.2" strokeLinejoin="round" transform="translate(6 4)" />
    <path d="M40 12 H54" stroke="#2E3A59" strokeWidth="2" />
  </>
);

const Hat = ({ fill }) => (
  <>
    <path d="M8 40 Q8 10 30 8 Q52 10 52 40 Z" fill={fill} stroke="#2E3A59" strokeWidth="2.2" strokeLinejoin="round" />
    <rect x="5" y="38" width="50" height="10" rx="5" fill="#fff" stroke="#2E3A59" strokeWidth="2.2" />
    <circle cx="30" cy="6" r="6" fill="#fff" stroke="#2E3A59" strokeWidth="2.2" />
  </>
);

const Bib = ({ fill }) => (
  <>
    <path d="M18 4 Q30 16 42 4 Q56 10 54 30 Q52 54 30 56 Q8 54 6 30 Q4 10 18 4 Z" fill={fill} stroke="#2E3A59" strokeWidth="2.2" strokeLinejoin="round" />
    <path d="M30 26 l2.5 5 5.5 .8 -4 3.9 .9 5.5 -4.9 -2.6 -4.9 2.6 .9 -5.5 -4 -3.9 5.5 -.8 Z" fill="#fff" />
  </>
);

const WIDE = [
  { t: 0.1, C: Onesie, fill: '#F7B9A1', scale: 1.9 },
  { t: 0.29, C: Socks, fill: '#A8D8C8', scale: 1.6 },
  { t: 0.5, C: Hat, fill: '#C9B6E4', scale: 1.7 },
  { t: 0.71, C: Bib, fill: '#F5D77E', scale: 1.6 },
  { t: 0.9, C: Onesie, fill: '#A8D8C8', scale: 1.9 },
];
const NARROW = [
  { t: 0.17, C: Onesie, fill: '#F7B9A1', scale: 1.5 },
  { t: 0.5, C: Hat, fill: '#C9B6E4', scale: 1.35 },
  { t: 0.83, C: Socks, fill: '#A8D8C8', scale: 1.3 },
];

function Line({ W, H, sag, items, className }) {
  const reduce = useReducedMotion();
  const curveY = (t) => 24 + 4 * sag * t * (1 - t);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={`h-auto w-full overflow-visible ${className}`} role="img" aria-label="Tendedero con ropa de bebé">
      <path d={`M-20 24 Q${W / 2} ${24 + 2 * sag} ${W + 20} 24`} fill="none" stroke="#2E3A59" strokeWidth="2" />
      {items.map(({ t, C, fill, scale }, i) => {
        const x = t * W;
        const y = curveY(t);
        return (
          <motion.g
            key={i}
            style={{ transformBox: 'view-box', transformOrigin: `${x}px ${y}px` }}
            initial={reduce ? false : { rotate: i % 2 ? -14 : 14 }}
            animate={{ rotate: 0 }}
            transition={{ type: 'spring', stiffness: 40, damping: 3.5, mass: 1.2, delay: 0.15 + i * 0.12 }}
          >
            <g transform={`translate(${x - 30 * scale} ${y + 8}) scale(${scale})`}>
              <C fill={fill} />
            </g>
            {/* perrito de ropa */}
            <rect x={x - 6} y={y - 11} width="12" height="26" rx="3" fill="#C99A6B" stroke="#2E3A59" strokeWidth="1.8" />
          </motion.g>
        );
      })}
    </svg>
  );
}

export default function Clothesline() {
  return (
    <>
      <Line W={600} H={150} sag={22} items={NARROW} className="sm:hidden" />
      <Line W={1200} H={190} sag={40} items={WIDE} className="hidden sm:block" />
    </>
  );
}
