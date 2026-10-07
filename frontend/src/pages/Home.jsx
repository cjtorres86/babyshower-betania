import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarHeart, Clock, MapPin, RefreshCw } from 'lucide-react';
import Clothesline from '../components/Clothesline';
import GiftTag from '../components/GiftTag';
import ReserveDialog from '../components/ReserveDialog';
import { api } from '../api';
import { EVENT } from '../config';

const POLL_MS = 8000;

function useEventInfo() {
  return useMemo(() => {
    const date = new Date(EVENT.date);
    const label = new Intl.DateTimeFormat('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const day = new Date(date);
    day.setHours(0, 0, 0, 0);
    const days = Math.round((day - today) / 86_400_000);
    let countdown = '';
    if (days > 1) countdown = `Faltan ${days} días`;
    else if (days === 1) countdown = '¡Es mañana!';
    else if (days === 0) countdown = '¡Es hoy!';
    return { label: label.charAt(0).toUpperCase() + label.slice(1), countdown };
  }, []);
}

export default function Home() {
  const [gifts, setGifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [lastReservedId, setLastReservedId] = useState(null);
  const info = useEventInfo();
  const closeDialog = useCallback(() => setSelected(null), []);

  const load = useCallback(async () => {
    try {
      const data = await api.listGifts();
      setGifts(data);
      setLoadError('');
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Carga inicial + actualización automática para ver lo que reservan los demás
  useEffect(() => {
    load();
    const id = setInterval(() => document.visibilityState === 'visible' && load(), POLL_MS);
    const onVisible = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  const reservedCount = gifts.filter((g) => g.reserved).length;
  const available = gifts.length - reservedCount;
  const visible = gifts.filter((g) => (filter === 'all' ? true : filter === 'free' ? !g.reserved : g.reserved));

  const onReserved = (updated) => {
    setGifts((gs) => gs.map((g) => (g.id === updated.id ? updated : g)));
    setLastReservedId(updated.id);
  };

  const filters = [
    { key: 'all', label: 'Todos', count: gifts.length },
    { key: 'free', label: 'Disponibles', count: available },
    { key: 'taken', label: 'Reservados', count: reservedCount },
  ];

  return (
    <div className="min-h-screen pb-20">
      {/* Tendedero */}
      <div className="mx-auto max-w-6xl px-2 pt-4 sm:px-6">
        <Clothesline />
      </div>

      <header className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid gap-10 md:grid-cols-[1.15fr_0.85fr] md:items-end">
          <div>
            <p className="font-display text-2xl text-tinta-soft sm:text-3xl">Baby shower de</p>
            <h1 className="font-display text-[4.2rem] font-semibold leading-[0.95] tracking-tight sm:text-[7rem] lg:text-[8.5rem]">
              {EVENT.mom}
            </h1>
            <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-tinta-soft">{EVENT.message}</p>
          </div>

          <dl className="tag-shape relative bg-white px-7 pb-7 pt-11 shadow-[0_18px_40px_-24px_rgba(46,58,89,0.5)]">
            <span className="absolute left-1/2 top-4 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-tinta bg-nube" aria-hidden="true" />
            <div className="flex gap-3">
              <CalendarHeart className="mt-0.5 shrink-0 text-timbre" size={22} aria-hidden="true" />
              <div>
                <dt className="sr-only">Fecha</dt>
                <dd className="font-display text-xl">{info.label}</dd>
                {info.countdown && <dd className="text-tinta-soft">{info.countdown}</dd>}
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <Clock className="mt-0.5 shrink-0 text-timbre" size={22} aria-hidden="true" />
              <div>
                <dt className="sr-only">Hora</dt>
                <dd className="font-semibold">{EVENT.timeLabel}</dd>
              </div>
            </div>
            <div className="mt-4 flex gap-3">
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
          </dl>
        </div>
      </header>

      <main className="mx-auto mt-16 max-w-6xl px-5 sm:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-3xl sm:text-4xl">Lista de regalos</h2>
            {!loading && gifts.length > 0 && (
              <p className="mt-1 text-tinta-soft">
                {available === 0
                  ? 'Todos los regalos ya fueron reservados. ¡Gracias a todos!'
                  : `Quedan ${available} de ${gifts.length} regalos disponibles.`}
              </p>
            )}
          </div>

          <div role="tablist" aria-label="Filtrar regalos" className="inline-flex self-start rounded-full bg-white p-1 sm:self-auto">
            {filters.map((f) => (
              <button
                key={f.key}
                role="tab"
                aria-selected={filter === f.key}
                onClick={() => setFilter(f.key)}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  filter === f.key ? 'bg-tinta text-white' : 'text-tinta-soft hover:text-tinta'
                }`}
              >
                {f.label} <span className="opacity-60">{f.count}</span>
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <ul className="mt-6 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="pt-7">
                <div className="tag-shape h-44 animate-pulse bg-white/70" />
              </li>
            ))}
          </ul>
        )}

        {!loading && loadError && (
          <div className="mt-10 rounded-3xl bg-white px-6 py-8 text-center">
            <p className="font-semibold">{loadError}</p>
            <button
              onClick={() => {
                setLoading(true);
                load();
              }}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-tinta px-5 py-2.5 font-bold text-white"
            >
              <RefreshCw size={16} /> Reintentar
            </button>
          </div>
        )}

        {!loading && !loadError && gifts.length === 0 && (
          <p className="mt-10 rounded-3xl bg-white px-6 py-8 text-center text-tinta-soft">
            La lista todavía está vacía. Vuelve pronto para ver los regalos.
          </p>
        )}

        {!loading && !loadError && gifts.length > 0 && visible.length === 0 && (
          <p className="mt-10 text-center text-tinta-soft">
            {filter === 'free' ? 'Ya no quedan regalos disponibles.' : 'Todavía nadie ha reservado un regalo. ¡Sé la primera persona!'}
          </p>
        )}

        {!loading && visible.length > 0 && (
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((g) => (
              <GiftTag
                key={g.id}
                gift={g}
                index={gifts.indexOf(g)}
                onSelect={setSelected}
                justReserved={g.id === lastReservedId}
              />
            ))}
          </ul>
        )}
      </main>

      <footer className="mx-auto mt-20 max-w-6xl px-5 text-center text-sm text-tinta-soft sm:px-8">
        <p>Hecho con cariño para {EVENT.mom} y su bebé.</p>
        <Link to="/admin" className="mt-4 inline-flex items-center rounded-full bg-tinta px-5 py-2.5 font-bold text-white hover:bg-tinta/90">
          Ingresar (Administrador / Betania)
        </Link>
      </footer>

      <ReserveDialog
        gift={selected}
        onClose={closeDialog}
        onReserved={onReserved}
        onConflict={load}
      />
    </div>
  );
}
