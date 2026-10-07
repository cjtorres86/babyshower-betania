# Lista de regalos · Baby shower de Betania 🍼

Página web donde los invitados eligen un regalo y lo reservan con su nombre. Lo reservado aparece marcado para todos (la lista se actualiza sola cada pocos segundos), así nadie repite regalos.

- **Frontend:** React + Vite + Tailwind CSS + Framer Motion → se publica en **Vercel**
- **Backend:** Node.js + Express → se publica en **Render**
- **Base de datos:** MySQL → en **Aiven**

```
babyshower-betania/
├── backend/      API (Express + MySQL)
├── frontend/     Página de los invitados y panel /admin
└── render.yaml   Configuración automática para Render
```

---

## Paso 1 · Subir a GitHub

1. Crea un repositorio nuevo en GitHub (por ejemplo `babyshower-betania`), sin README.
2. En la carpeta del proyecto:

```bash
git remote add origin https://github.com/TU_USUARIO/babyshower-betania.git
git branch -M main
git push -u origin main
```

> El proyecto ya viene con un commit inicial. Si no, ejecuta antes `git init && git add . && git commit -m "Primer commit"`.

## Paso 2 · Base de datos en Aiven (MySQL)

1. Entra a [console.aiven.io](https://console.aiven.io) → **Create service** → **MySQL** → plan **Free**.
2. Cuando el servicio esté en estado *Running*, en **Overview** copia el **Service URI**. Se ve así:
   `mysql://avnadmin:CLAVE@mysql-xxxx.aivencloud.com:12345/defaultdb?ssl-mode=REQUIRED`
3. (Opcional, más seguro) Descarga el **CA certificate** de la misma pantalla. Lo usarás en el paso 3.

No necesitas crear tablas: el backend crea la tabla `gifts` sola la primera vez que arranca y carga 16 regalos de ejemplo (puedes editarlos o borrarlos desde el panel).

## Paso 3 · Backend en Render

1. Entra a [render.com](https://render.com) → **New** → **Blueprint** → elige tu repositorio. Render leerá `render.yaml` automáticamente.
   *(Alternativa manual: New → Web Service → Root Directory `backend`, Build `npm install`, Start `npm start`.)*
2. Completa las variables de entorno:

| Variable | Valor |
|---|---|
| `DATABASE_URL` | El Service URI de Aiven |
| `DB_CA_CERT` | (Opcional) El contenido del certificado CA de Aiven |
| `ADMIN_PASSWORD` | La contraseña para entrar a `/admin` |
| `JWT_SECRET` | Render la genera sola (si es manual, escribe un texto largo al azar) |
| `FRONTEND_URL` | La URL de Vercel del paso 4 (puedes completarla después) |

3. Cuando termine, copia la URL del servicio, por ejemplo `https://babyshower-betania-api.onrender.com`. Ábrela con `/api/health` al final: debe responder `{"ok":true}`.

> En el plan gratis de Render el servidor se "duerme" tras 15 minutos sin uso y la primera visita puede tardar ~30 segundos en cargar. Para el día del evento puedes abrir la página un rato antes.

## Paso 4 · Frontend en Vercel

1. Entra a [vercel.com](https://vercel.com) → **Add New** → **Project** → importa tu repositorio.
2. En **Root Directory** elige `frontend`. Vercel detecta Vite solo.
3. En **Environment Variables** agrega:
   - `VITE_API_URL` = la URL de Render del paso 3 (sin `/` al final)
4. **Deploy**. Copia tu URL (ej: `https://babyshower-betania.vercel.app`).
5. Vuelve a Render y pon esa URL en `FRONTEND_URL`. Render se reinicia solo.

¡Listo! Comparte el link de Vercel con los invitados.

---

## Panel de administración

Entra a `https://TU-SITIO.vercel.app/admin` con la contraseña `ADMIN_PASSWORD`. Desde ahí puedes:

- Agregar regalos (nombre + comentario)
- Editar o eliminar regalos
- Liberar un regalo si alguien se equivocó al reservarlo

## Cambiar los datos del evento

Edita `frontend/src/config.js` (fecha, hora, lugar, link de Google Maps y mensaje de bienvenida), haz commit y push. Vercel publica el cambio en un minuto.

## Probar en tu computador

Necesitas Node 18+ y una base MySQL (puedes usar la misma de Aiven).

```bash
# Backend
cd backend
cp .env.example .env      # completa DATABASE_URL y ADMIN_PASSWORD
npm install
npm run dev               # http://localhost:4000

# Frontend (en otra terminal)
cd frontend
cp .env.example .env      # VITE_API_URL=http://localhost:4000
npm install
npm run dev               # http://localhost:5173
```

## Cómo se evita que dos personas reserven lo mismo

La reserva se hace con una sola instrucción en la base de datos que solo marca el regalo si todavía está libre (`UPDATE ... WHERE reserved_by IS NULL`). Si dos invitados aprietan al mismo tiempo, solo uno lo consigue y al otro se le avisa que elija otro regalo.
