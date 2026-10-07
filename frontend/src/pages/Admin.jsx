import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, LogOut, Pencil, Plus, Trash2, Undo2, Check, X } from 'lucide-react';
import { api } from '../api';
import { EVENT } from '../config';

const TOKEN_KEY = 'bs-betania-admin';
const store = {
  get: () => {
    try {
      return sessionStorage.getItem(TOKEN_KEY) || '';
    } catch {
      return '';
    }
  },
  set: (t) => {
    try {
      t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      /* sin almacenamiento */
    }
  },
};

const inputCls =
  'w-full rounded-xl border-2 border-nube-deep bg-nube px-3.5 py-2.5 outline-none transition focus:border-tinta focus:bg-white';
const btnDark = 'inline-flex items-center justify-center gap-2 rounded-full bg-tinta px-5 py-2.5 font-bold text-white hover:bg-tinta/90 disabled:opacity-60';

function Login({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { token } = await api.login(password);
      onLogin(token);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="tag-shape relative mx-auto mt-16 max-w-sm bg-white px-7 pb-7 pt-12">
      <span className="absolute left-1/2 top-4 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-tinta bg-nube" aria-hidden="true" />
      <h1 className="font-display text-2xl">Administrar lista</h1>
      <p className="mt-1 text-tinta-soft">Ingresa la contraseña del panel.</p>
      <label htmlFor="pw" className="mt-5 block font-semibold">
        Contraseña
      </label>
      <input id="pw" type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputCls} mt-2`} />
      {error && (
        <p role="alert" className="mt-3 text-sm font-semibold text-timbre">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy || !password} className={`${btnDark} mt-5 w-full`}>
        {busy && <Loader2 size={16} className="animate-spin" />} Entrar
      </button>
    </form>
  );
}

function GiftRow({ gift, token, onChanged, onDeleted, onAuthError }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(gift.name);
  const [comment, setComment] = useState(gift.comment);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (fn) => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (err) {
      if (err.status === 401) return onAuthError();
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const save = () =>
    run(async () => {
      onChanged(await api.updateGift(token, gift.id, { name, comment }));
      setEditing(false);
    });
  const release = () => {
    if (!confirm(`¿Liberar "${gift.name}"? Volverá a estar disponible para todos.`)) return;
    run(async () => onChanged(await api.releaseGift(token, gift.id)));
  };
  const remove = () => {
    if (!confirm(`¿Eliminar "${gift.name}" de la lista? Esta acción no se puede deshacer.`)) return;
    run(async () => {
      await api.deleteGift(token, gift.id);
      onDeleted(gift.id);
    });
  };

  return (
    <li className="rounded-2xl bg-white px-5 py-4">
      {editing ? (
        <div className="grid gap-3">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} aria-label="Nombre del regalo" />
          <input value={comment} onChange={(e) => setComment(e.target.value)} className={inputCls} placeholder="Comentario (opcional)" aria-label="Comentario" />
          <div className="flex gap-2">
            <button onClick={save} disabled={busy} className={btnDark}>
              <Check size={16} /> Guardar cambios
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setName(gift.name);
                setComment(gift.comment);
              }}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 font-bold text-tinta-soft hover:bg-nube"
            >
              <X size={16} /> Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg leading-snug">{gift.name}</p>
            {gift.comment && <p className="text-sm text-tinta-soft">{gift.comment}</p>}
            {gift.reserved ? (
              <p className="mt-1 text-sm font-semibold text-timbre">
                Reservado por {gift.reservedBy}
                {gift.reservedAt && ` el ${new Date(gift.reservedAt).toLocaleDateString('es-CL')}`}
              </p>
            ) : (
              <p className="mt-1 text-sm font-semibold text-emerald-700">Disponible</p>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {gift.reserved && (
              <button onClick={release} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full bg-nube px-3.5 py-2 text-sm font-bold hover:bg-nube-deep">
                <Undo2 size={15} /> Liberar
              </button>
            )}
            <button onClick={() => setEditing(true)} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full bg-nube px-3.5 py-2 text-sm font-bold hover:bg-nube-deep">
              <Pencil size={15} /> Editar
            </button>
            <button onClick={remove} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-bold text-timbre hover:bg-timbre/10">
              <Trash2 size={15} /> Eliminar
            </button>
          </div>
        </div>
      )}
      {error && <p className="mt-2 text-sm font-semibold text-timbre">{error}</p>}
    </li>
  );
}

export default function Admin() {
  const [token, setToken] = useState(store.get);
  const [gifts, setGifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [comment, setComment] = useState('');
  const [adding, setAdding] = useState(false);
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
      .listGifts()
      .then(setGifts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function addGift(e) {
    e.preventDefault();
    setAdding(true);
    setError('');
    try {
      const g = await api.createGift(token, { name, comment });
      setGifts((gs) => [...gs, g]);
      setName('');
      setComment('');
    } catch (err) {
      if (err.status === 401) logout();
      setError(err.message);
    } finally {
      setAdding(false);
    }
  }

  const reserved = gifts.filter((g) => g.reserved).length;

  return (
    <div className="min-h-screen px-5 pb-20 pt-8 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 font-semibold text-tinta-soft hover:text-tinta">
            <ArrowLeft size={18} /> Ver la lista
          </Link>
          {token && (
            <button onClick={logout} className="inline-flex items-center gap-2 font-semibold text-tinta-soft hover:text-tinta">
              <LogOut size={18} /> Salir
            </button>
          )}
        </div>

        {!token ? (
          <Login onLogin={login} />
        ) : (
          <>
            <h1 className="mt-8 font-display text-4xl">Regalos para {EVENT.mom}</h1>
            <p className="mt-1 text-tinta-soft">
              {gifts.length} regalos en la lista, {reserved} reservados.
            </p>

            <form onSubmit={addGift} className="mt-8 grid gap-3 rounded-2xl bg-white p-5 sm:grid-cols-[1fr_1fr_auto]">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del regalo" aria-label="Nombre del regalo" className={inputCls} />
              <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Comentario (opcional)" aria-label="Comentario" className={inputCls} />
              <button type="submit" disabled={adding || name.trim().length < 2} className={btnDark}>
                {adding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Agregar regalo
              </button>
            </form>
            {error && (
              <p role="alert" className="mt-3 font-semibold text-timbre">
                {error}
              </p>
            )}

            {loading ? (
              <p className="mt-8 text-tinta-soft">Cargando regalos…</p>
            ) : gifts.length === 0 ? (
              <p className="mt-8 text-tinta-soft">La lista está vacía. Agrega el primer regalo arriba.</p>
            ) : (
              <ul className="mt-6 grid gap-3">
                {gifts.map((g) => (
                  <GiftRow
                    key={g.id}
                    gift={g}
                    token={token}
                    onAuthError={logout}
                    onChanged={(u) => setGifts((gs) => gs.map((x) => (x.id === u.id ? u : x)))}
                    onDeleted={(id) => setGifts((gs) => gs.filter((x) => x.id !== id))}
                  />
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
