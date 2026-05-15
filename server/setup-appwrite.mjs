/**
 * Appwrite: `drivers` kolleksiyasi + `orders` ga haydovchi maydonlari.
 * Ishlatish: server/.env dan key bilan `npm run setup`
 */
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { Client, Databases, Permission, Role, IndexType } from "node-appwrite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) {
    console.error("server/.env yo'q. Avval: cp env.example .env");
    process.exit(1);
  }
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1);
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}

loadEnv();

const ENDPOINT = process.env.APPWRITE_ENDPOINT;
const PROJECT = process.env.APPWRITE_PROJECT_ID;
const API_KEY = process.env.APPWRITE_API_KEY?.replace(/^["']|["']$/g, "").trim();
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const ORDERS = process.env.APPWRITE_ORDERS_COLLECTION || "orders";
const DRIVERS = process.env.APPWRITE_DRIVERS_COLLECTION || "drivers";

if (!ENDPOINT || !PROJECT || !API_KEY || !DATABASE_ID) {
  console.error("APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY, APPWRITE_DATABASE_ID kerak.");
  process.exit(1);
}

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT).setKey(API_KEY);
const databases = new Databases(client);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitAttribute(collId, key, timeoutMs = 180000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const a = await databases.getAttribute(DATABASE_ID, collId, key);
    const st = a.status;
    if (st === "available") return;
    if (st === "failed") throw new Error(`Attribute "${key}" failed: ${JSON.stringify(a)}`);
    await sleep(700);
  }
  throw new Error(`Timeout waiting for attribute "${key}"`);
}

async function createAttrSafe(label, fn) {
  try {
    await fn();
    console.log(`  + ${label}`);
  } catch (e) {
    const t = e?.type || "";
    const c = e?.code;
    const msg = String(e?.message || e);
    if (c === 409 || t === "attribute_already_exists" || msg.includes("already exists")) {
      console.log(`  = ${label} (allaqachon bor)`);
      return;
    }
    throw e;
  }
}

async function ensureDriversCollection() {
  let createdNew = false;
  try {
    await databases.getCollection(DATABASE_ID, DRIVERS);
    console.log(`Kolleksiya "${DRIVERS}" bor.`);
  } catch (e) {
    if (e?.code !== 404) throw e;
    console.log(`Kolleksiya "${DRIVERS}" yaratilmoqda...`);
    await databases.createCollection(
      DATABASE_ID,
      DRIVERS,
      "Drivers",
      [
        Permission.read(Role.any()),
        Permission.create(Role.any()),
        Permission.update(Role.any()),
        Permission.delete(Role.any()),
      ],
      false,
      true
    );
    createdNew = true;
  }

  const stringAttrs = [
    ["telegram_chat_id", 64, true],
    ["name", 200, true],
    ["phone", 40, true],
    ["remote_region", 100, true],
  ];
  for (const [key, size, req] of stringAttrs) {
    await createAttrSafe(key, () =>
      databases.createStringAttribute(DATABASE_ID, DRIVERS, key, size, req, undefined, false, false)
    );
    await waitAttribute(DRIVERS, key);
  }

  await createAttrSafe("active", () =>
    databases.createBooleanAttribute(DATABASE_ID, DRIVERS, "active", true, undefined, false)
  );
  await waitAttribute(DRIVERS, "active");

  await createAttrSafe("created_at", () =>
    databases.createDatetimeAttribute(DATABASE_ID, DRIVERS, "created_at", true, undefined, false)
  );
  await waitAttribute(DRIVERS, "created_at");

  try {
    await databases.createIndex(DATABASE_ID, DRIVERS, "telegram_chat_id_unique", IndexType.Unique, [
      "telegram_chat_id",
    ]);
    console.log("  + index telegram_chat_id (unique)");
  } catch (e) {
    if (e?.code === 409 || String(e?.message).includes("already")) {
      console.log("  = index telegram_chat_id (bor)");
    } else throw e;
  }

  if (createdNew) console.log(`"${DRIVERS}" yangi yaratildi.`);
}

async function ensureOrdersAttributes() {
  console.log(`"${ORDERS}" kolleksiyasiga maydonlar...`);

  await createAttrSafe("drivers_notified", () =>
    databases.createBooleanAttribute(DATABASE_ID, ORDERS, "drivers_notified", false, false, false)
  );
  await waitAttribute(ORDERS, "drivers_notified");

  await createAttrSafe("driver_chat_id", () =>
    databases.createStringAttribute(DATABASE_ID, ORDERS, "driver_chat_id", 64, false, undefined, false, false)
  );
  await waitAttribute(ORDERS, "driver_chat_id");

  await createAttrSafe("driver_name", () =>
    databases.createStringAttribute(DATABASE_ID, ORDERS, "driver_name", 200, false, undefined, false, false)
  );
  await waitAttribute(ORDERS, "driver_name");

  await createAttrSafe("driver_phone", () =>
    databases.createStringAttribute(DATABASE_ID, ORDERS, "driver_phone", 40, false, undefined, false, false)
  );
  await waitAttribute(ORDERS, "driver_phone");

  await createAttrSafe("customer_name", () =>
    databases.createStringAttribute(DATABASE_ID, ORDERS, "customer_name", 200, false, undefined, false, false)
  );
  await waitAttribute(ORDERS, "customer_name");

  await createAttrSafe("customer_phone", () =>
    databases.createStringAttribute(DATABASE_ID, ORDERS, "customer_phone", 40, false, undefined, false, false)
  );
  await waitAttribute(ORDERS, "customer_phone");

  await createAttrSafe("departure_time", () =>
    databases.createStringAttribute(DATABASE_ID, ORDERS, "departure_time", 120, false, undefined, false, false)
  );
  await waitAttribute(ORDERS, "departure_time");

  console.log("Buyurtmalar maydonlari tayyor.");
}

async function main() {
  console.log("Appwrite sxema sozlash...\n");
  await ensureDriversCollection();
  await ensureOrdersAttributes();
  console.log("\nTayyor. Endi: npm start (haydovchi boti)");
}

main().catch((e) => {
  console.error(e?.message || e);
  if (e?.response) console.error(JSON.stringify(e.response, null, 2));
  process.exit(1);
});
