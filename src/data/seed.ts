/**
 * Run this script to seed Appwrite with regions and districts data.
 * Usage: npx tsx src/data/seed.ts
 */
import { Client, Databases, ID } from "appwrite";

const client = new Client()
  .setEndpoint("https://fra.cloud.appwrite.io/v1")
  .setProject("6a019068001ba227d8d6");

const databases = new Databases(client);
const DATABASE_ID = "pitak-db";

const regions = [
  { name_uz: "Toshkent", name_ru: "Ташкент", is_new: false },
  { name_uz: "Andijon", name_ru: "Андижан", is_new: true },
  { name_uz: "Buxoro", name_ru: "Бухара", is_new: true },
  { name_uz: "Farg'ona", name_ru: "Фергана", is_new: false },
  { name_uz: "Jizzax", name_ru: "Джизак", is_new: true },
  { name_uz: "Namangan", name_ru: "Наманган", is_new: true },
  { name_uz: "Navoiy", name_ru: "Навои", is_new: true },
  { name_uz: "Qashqadaryo", name_ru: "Кашкадарья", is_new: true },
  { name_uz: "Samarqand", name_ru: "Самарканд", is_new: false },
  { name_uz: "Sirdaryo", name_ru: "Сырдарья", is_new: false },
  { name_uz: "Surxondaryo", name_ru: "Сурхандарья", is_new: false },
  { name_uz: "Xorazm", name_ru: "Хорезм", is_new: false },
  { name_uz: "Qoraqalpog'iston", name_ru: "Каракалпакстан", is_new: false },
];

const districtsByRegion: Record<string, { name_uz: string; name_ru: string; is_new: boolean }[]> = {
  Andijon: [
    { name_uz: "Andijon shahri", name_ru: "Город Андижан", is_new: false },
    { name_uz: "Andijon tumani", name_ru: "Андижанский район", is_new: false },
    { name_uz: "Asaka", name_ru: "Асака", is_new: false },
    { name_uz: "Baliqchi", name_ru: "Балыкчи", is_new: false },
    { name_uz: "Bo'ston", name_ru: "Бустон", is_new: true },
    { name_uz: "Buloqboshi", name_ru: "Булакбаши", is_new: false },
    { name_uz: "Izboskan", name_ru: "Избоскан", is_new: false },
    { name_uz: "Jalaquduq", name_ru: "Джалакудук", is_new: false },
    { name_uz: "Xo'jaobod", name_ru: "Ходжаабад", is_new: false },
    { name_uz: "Marhamat", name_ru: "Мархамат", is_new: false },
    { name_uz: "Oltinko'l", name_ru: "Алтынкуль", is_new: false },
    { name_uz: "Paxtaobod", name_ru: "Пахтаабад", is_new: false },
    { name_uz: "Qo'rg'ontepa", name_ru: "Кургантепа", is_new: false },
    { name_uz: "Shahrixon", name_ru: "Шахрихан", is_new: false },
    { name_uz: "Ulug'nor", name_ru: "Улугнор", is_new: false },
  ],
};

async function seed() {
  console.log("Seeding regions...");
  for (const region of regions) {
    try {
      const doc = await databases.createDocument(DATABASE_ID, "regions", ID.unique(), region);
      console.log(`  ✓ ${region.name_uz} (${doc.$id})`);

      const regionDistricts = districtsByRegion[region.name_uz];
      if (regionDistricts) {
        for (const district of regionDistricts) {
          await databases.createDocument(DATABASE_ID, "districts", ID.unique(), {
            region_id: doc.$id,
            ...district,
          });
          console.log(`    ✓ ${district.name_uz}`);
        }
      }
    } catch (err) {
      console.error(`  ✗ ${region.name_uz}:`, err);
    }
  }
  console.log("Done!");
}

seed();
