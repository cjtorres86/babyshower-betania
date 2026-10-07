import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft, Download, Heart, LogOut } from 'lucide-react';
import { api } from '../api';
import { EVENT } from '../config';
import { downloadDedications } from '../download';
import Thread from '../components/Thread';

// /betania ahora usa el mismo ingreso que el administrador
export default function Betania() {
  return <Navigate to="/admin" replace />;
}

/** Vista de Betania: solo lectura de dedicatorias. */
export function BetaniaView({ token, onLogout }) {
  const [gifts, setGifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    api
      .listPrivateGifts(token)
      .then(setGifts)
      .catch((e) => {
        if (e.status === 401 || e.status === 403) onLogout();
        setError(e.message);
      })
      .finally(() => setLoading(false));
  }, [token, onLogout]);

  const reserved = gifts
    .filter((g) => g.reserved)
    .sort((a, b) => new Date(b.reservedAt || 0) - new Date(a.reservedAt || 0));
  const withDedication = reserved.filter((g) => g.dedication);

  return (
    <div className="min-h-screen px-5 pb-20 pt-8 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 font-semibold text-tinta-soft hover:text-tinta">
            <ArrowLeft size={18} /> Ver la lista
          </Link>
          <button onClick={onLogout} className="inline-flex items-center gap-2 font-semibold text-tinta-soft hover:text-tinta">
            <LogOut size={18} /> Salir
          </button>
        </div>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Heart size={28} className="text-timbre" />
              <h1 className="font-display text-4xl">Hola, {EVENT.mom}</h1>
            </div>
            <p className="mt-1 text-tinta-soft">
              {reserved.length} regalos reservados · {withDedication.length} con dedicatoria secreta
            </p>
          </div>
          <button
            onClick={() => downloadDedications(gifts)}
            disabled={withDedication.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-tinta px-5 py-2.5 font-bold text-white hover:bg-tinta/90 disabled:opacity-50"
          >
            <Download size={16} /> Descargar dedicatorias
          </button>
        </div>

        {loading ? (
          <p className="mt-8 text-tinta-soft">Cargando regalos…</p>
        ) : error ? (
          <p className="mt-8 font-semibold text-timbre">{error}</p>
        ) : reserved.length === 0 ? (
          <p className="mt-8 text-tinta-soft">Todavía nadie ha reservado un regalo. ¡Pronto llegará el amor de tus invitados!</p>
        ) : (
          <ul className="mt-6 grid gap-3">
            {reserved.map((g) => (
              <li key={g.id} className="rounded-2xl bg-white px-5 py-4">
                <p className="font-display text-lg leading-snug">{g.name}</p>
                <p className="text-sm font-semibold text-timbre">
                  De {g.reservedBy}
                  {g.reservedAt && ` · ${new Date(g.reservedAt).toLocaleDateString('es-CL')}`}
                </p>
                <Thread
                  giftId={g.id}
                  viewer="betania"
                  auth={{ token }}
                  initial={g.messages || []}
                  collapsible
                  names={{ own: 'Tú', other: g.reservedBy }}
                />
                {g.dedication ? (
                  <div className="mt-3 rounded-xl bg-lila/40 px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-tinta-soft">🔒 Dedicatoria secreta</p>
                    <p className="mt-1 leading-relaxed text-tinta">{g.dedication}</p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm italic text-tinta-soft/70">Sin dedicatoria</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
