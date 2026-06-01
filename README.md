# Pitak — Viloyatlararo Taksi

Uzbekiston bo'ylab viloyatlararo taksi buyurtma qilish uchun web ilova.

## Tech Stack

- React + TypeScript + Vite
- Tailwind CSS
- Leaflet + OpenStreetMap
- Supabase (Auth, Database, Storage, Realtime)
- Zustand (state management)
- React Router
- i18next (O'zbek + Rus)

## Ishga tushirish

1. [Supabase](https://supabase.com) loyihasida `supabase/schema.sql` ni **SQL Editor** da ishga tushiring.
2. `.env.example` dan nusxa oling va to'ldiring:

```bash
cp .env.example .env
# VITE_SUPABASE_URL — Dashboard → Settings → API → Project URL
# VITE_SUPABASE_ANON_KEY — publishable (anon) key
```

3. Ilovani ishga tushiring:

```bash
npm install
npm run dev
```

**Authentication:** Dashboard → Authentication → Providers → Email yoqilgan bo'lishi kerak.

## Haydovchi boti

```bash
cd server
cp env.example .env
npm install
npm start
```

`SUPABASE_SERVICE_ROLE_KEY` (secret) va `TELEGRAM_BOT_TOKEN` kerak.

## Ekranlar

| Yo'l | Tavsif |
|------|--------|
| `/login` | Kirish |
| `/register` | Ro'yxatdan o'tish |
| `/` | Bosh sahifa (xarita) |
| `/order` | Buyurtma berish |
| `/history` | Buyurtmalar tarixi |
| `/profile` | Profil |
| `/saved-places` | Saqlangan joylar |
