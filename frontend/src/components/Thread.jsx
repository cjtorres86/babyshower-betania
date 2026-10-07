import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, MessageCircle, Send } from 'lucide-react';
import { api } from '../api';

const fmt = (d) =>
  d ? new Date(d).toLocaleString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

/**
 * Conversación de un regalo.
 * viewer: 'guest' (quien reservó) o 'betania' (Betania / admin)
 * auth: { ownerToken } para el invitado, { token } para Betania/admin
 */
export default function Thread({ giftId, viewer, auth, initial, names, collapsible = false, poll = false }) {
  const [messages, setMessages] = useState(initial || []);
  const [loading, setLoading] = useState(initial === undefined);
  const [open, setOpen] = useState(!collapsible);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef(null);
  const own = viewer === 'guest' ? 'guest' : 'betania';

  const load = useCallback(async () => {
    try {
      setMessages(await api.thread(giftId, auth));
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [giftId, auth]);

  useEffect(() => {
    if (initial !== undefined && !poll) return;
    load();
    if (!poll) return;
    const id = setInterval(() => document.visibilityState === 'visible' && load(), 10000);
    return () => clearInterval(id);
  }, [load, initial, poll]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: 'nearest' });
  }, [messages, open]);

  async function send(e) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setBusy(true);
    setError('');
    try {
      const msg = await api.sendMessage(giftId, t, auth);
      setMessages((m) => [...m, msg]);
      setText('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 inline-flex items-center gap-2 rounded-full bg-nube px-4 py-2 text-sm font-bold hover:bg-nube-deep"
      >
        <MessageCircle size={16} /> Conversación ({messages.length})
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-2xl bg-nube p-3">
      {loading ? (
        <p className="p-2 text-sm text-tinta-soft">Cargando mensajes…</p>
      ) : (
        <ul className="grid max-h-72 gap-2 overflow-y-auto pr-1">
          {messages.length === 0 && (
            <li className="p-2 text-sm text-tinta-soft">Todavía no hay mensajes. ¡Escribe el primero!</li>
          )}
          {messages.map((m) => {
            const mine = m.author === own;
            return (
              <li key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                <span className="px-1 text-xs font-semibold text-tinta-soft">
                  {mine ? names.own : names.other} · {fmt(m.createdAt)}
                </span>
                <p
                  className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-[0.95rem] leading-snug ${
                    mine ? 'bg-tinta text-white' : 'bg-white text-tinta'
                  }`}
                >
                  {m.body}
                </p>
              </li>
            );
          })}
          <li ref={endRef} aria-hidden="true" />
        </ul>
      )}

      <form onSubmit={send} className="mt-2 flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          rows={2}
          aria-label="Escribir mensaje"
          placeholder={viewer === 'guest' ? 'Escribe tu respuesta…' : 'Responder…'}
          className="min-w-0 flex-1 resize-none rounded-xl border-2 border-nube-deep bg-white px-3 py-2 text-base outline-none focus:border-tinta"
        />
        <button
          type="submit"
          disabled={busy || !text.trim()}
          aria-label="Enviar mensaje"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-tinta text-white hover:bg-tinta/90 disabled:opacity-50"
        >
          {busy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </form>
      {error && <p role="alert" className="mt-2 text-sm font-semibold text-timbre">{error}</p>}
    </div>
  );
}
