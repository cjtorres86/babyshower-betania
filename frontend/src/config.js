// Edita aquí los datos del evento. Todo lo que ven los invitados sale de este archivo.
export const EVENT = {
  mom: 'Betania',
  // Formato: AAAA-MM-DDTHH:MM (hora de Chile)
  date: '2026-10-29T16:00',
  timeLabel: '16:00 hrs',
  place: 'Lugar por confirmar',
  placeDetail: '', // ej: "Av. Siempre Viva 742, Providencia"
  mapsUrl: '', // ej: link de Google Maps
  message:
    'Estamos preparando todo para recibir a nuestro bebé. Si quieres hacernos un regalo, elige uno de esta lista y resérvalo con tu nombre. Así los demás verán que ya está tomado y nadie lo repite.',
};

export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');
