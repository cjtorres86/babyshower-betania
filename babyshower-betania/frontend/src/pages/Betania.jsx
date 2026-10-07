import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, LogOut, Heart } from 'lucide-react';
import { api } from '../api';
import { EVENT } from '../config';

const TOKEN_KEY = 'bs-betania-user';
const store = {
  get: () => {
    try { return sessionStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; }
  },
  set: (t) => {
    try { t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY); } catch { /* sin almacenamiento */ }
  },
};

const inputCls =
  'w-full rounded-xl border-2 border-nube-deep bg-nube px-3.5 py-2.5 outline-none transition focus:border-tinta focus:bg-white';
const btnDark =
  'inline-flex items-center justify-center gap-2 rounded-full bg-tinta px-5 py-2.5 font-bold text-white hover:bg-tinta/90 disabled:opacity-60';

function Login({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { token } = await api.loginBetania(password);
      onLogin(token);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="tag-shape relative mx-auto mt-16 max-w-sm bg-white px-7 pb-7 pt-12"
    >
      <span
        className="absolute left-1/2 top-4 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-tinta bg-nube"
        aria-hidden="true"
      />
      <div className="flex items-center gap-2">
        <Heart size={20} className="text-timbre" />
        <h1 className="font-display text-2xl">Hola, {EVENT.mom}</h1>
      </div>
      <p className="mt-1 text-tinta-soft">
        Ingresa tu contraseña para ver las dedicatorias secretas de tus invitados.
      </p>
      <label htmlFor="pw" className="mt-5 block font-semibold">
        Contraseña
      </label>
      <input
        id="pw"
        type="password"
        autoFocus
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className={`${inputCls} mt-2`}
      />
      {error && (
        <p role="alert" className="mt-3 text-sm font-semibold text-timbre">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy || !password}
        className={`${btnDark} mt-5 w-full`}
      >
        {busy && <Loader2 size={16} className="animate-spin" />} Entrar
      </button>
    </form>
  );
}

export default function Betania() {
  const [token, setToken] = useState(store.get);
  const [gifts, setGifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const login = (t) => {
    store.set(t);
    setToken(t);
  };
  const logout = useCallback(() => {
    store.set('');
    setToken('');
  }, []);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    api
      .listPrivateGifts(token)
      .then(setGifts)
      .catch((e) => {
        if (e.status === 401 || e.status === 403) logout();
        setError(e.message);
      })
      .finally(() => setLoading(false));
  }, [token, logout]);

  const reserved = gifts.filter((g) => g.reserved);
  const withDedication = reserved.filter((g) => g.dedication);

  return (
    <div className="min-h-screen px-5 pb-20 pt-8 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-semibold text-tinta-soft hover:text-tinta"
          >
            <ArrowLeft size={18} /> Ver la lista
          </Link>
          {token && (
            <button
              onClick={logout}
              className="inline-flex items-center gap-2 font-semibold text-tinta-soft hover:text-tinta"
            >
              <LogOut size={18} /> Salir
            </button>
          )}
        </div>

        {!token ? (
          <Login onLogin={login} />
        ) : (
          <>
            <div className="mt-8">
              <div className="flex items-center gap-3">
                <Heart size={28} className="text-timbre" />
                <h1 className="font-display text-4xl">Tus dedicatorias</h1>
              </div>
              <p className="mt-1 text-tinta-soft">
                {reserved.length} regalos reservados ·{' '}
                {withDedication.length} con dedicatoria secreta
              </p>
            </div>

            {loading ? (
              <p className="mt-8 text-tinta-soft">Cargando regalos…</p>
            ) : error ? (
              <p className="mt-8 font-semibold text-timbre">{error}</p>
            ) : reserved.length === 0 ? (
              <p className="mt-8 text-tinta-soft">
                Todavía nadie ha reservado un regalo. ¡Pronto llegará el amor de tus invitados!
              </p>
            ) : (
              <ul className="mt-6 grid gap-3">
                {reserved.map((g) => (
                  <li key={g.id} className="rounded-2xl bg-white px-5 py-4">
                    <p className="font-display text-lg leading-snug">{g.name}</p>
                    <p className="text-sm font-semibold text-timbre">
                      De {g.reservedBy}
                      {g.reservedAt &&
                        ` · ${new Date(g.reservedAt).toLocaleDateString('es-CL')}`}
                    </p>
                    {g.guestNote && (
                      <p className="mt-2 text-sm text-tinta-soft">
                        <span className="font-semibold">Comentario:</span> {g.guestNote}
                      </p>
                    )}
                    {g.dedication ? (
                      <div className="mt-3 rounded-xl bg-lila/40 px-4 py-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-tinta-soft">
                          🔒 Dedicatoria secreta
                        </p>
                        <p className="mt-1 leading-relaxed text-tinta">{g.dedication}</p>
                      </div>
                    ) : (
                      <p className="mt-2 text-sm italic text-tinta-soft/70">
                        Sin dedicatoria
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
