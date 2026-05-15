# Pitak — Viloyatlararo Taksi

Uzbekiston bo'ylab viloyatlararo taksi buyurtma qilish uchun web ilova.

## Tech Stack

- React + TypeScript + Vite
- Tailwind CSS
- Leaflet + OpenStreetMap
- Appwrite (Auth, Database)
- Zustand (state management)
- React Router v6
- i18next (O'zbek + Rus)

## Ishga tushirish

```bash
npm install
npm run dev
```

## Appwrite Seed

Ma'lumotlar bazasiga viloyatlar va tumanlarni yuklash uchun:

```bash
npx tsx src/data/seed.ts
```

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
| `/promocodes` | Promokodlar |

## Environment

Appwrite konfiguratsiyasi `src/lib/appwrite.ts` faylida.
