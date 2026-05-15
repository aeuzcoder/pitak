/**
 * Pitak haydovchi boti + buyurtma xabarlari.
 *
 * Appwrite Console — yangi kolleksiya `drivers` (ID: drivers):
 *   - telegram_chat_id (string, required, unique)
 *   - name (string, required)
 *   - phone (string, required)
 *   - remote_region (string, required) — Toshkentdan boshqa viloyatning name_uz (masalan Andijon)
 *   - active (boolean, default true)
 *   - created_at (datetime)
 *
 * Kolleksiya `orders` ga qo'shing:
 *   - drivers_notified (boolean, default false)
 *   - driver_chat_id, driver_name, driver_phone (string, optional)
 *   - customer_name, customer_phone, departure_time (string, optional)
 *
 * Ishga tushirish: cp env.example .env && npm install && npm start
 */

import { Client, Databases, Query, ID } from "node-appwrite";
import { Agent, fetch as undiciFetch } from "undici";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TOSH = /toshkent|ташкент|tashkent/i;
const HUB_ALIASES = [/joriy\s*joylashuv/i, /текущее\s*местоположение/i, /current\s*location/i];

function isHub(region) {
  const s = String(region || "").trim();
  if (!s) return false;
  if (TOSH.test(s)) return true;
  return HUB_ALIASES.some((re) => re.test(s));
}

function getRemoteRegion(fromRegion, toRegion) {
  const from = String(fromRegion || "").trim();
  const to = String(toRegion || "").trim();
  if (!from || !to) return null;
  const fh = isHub(from);
  const th = isHub(to);
  if (fh && !th) return to;
  if (th && !fh) return from;
  return null;
}

/** `src/data/regions.ts` dagi name_uz bilan bir xil (Toshkentdan boshqa). */
const ROUTE_REGIONS = [
  { id: "andijon", name_uz: "Andijon" },
  { id: "buxoro", name_uz: "Buxoro" },
  { id: "fargona", name_uz: "Farg'ona" },
  { id: "jizzax", name_uz: "Jizzax" },
  { id: "namangan", name_uz: "Namangan" },
  { id: "navoiy", name_uz: "Navoiy" },
  { id: "qashqadaryo", name_uz: "Qashqadaryo" },
  { id: "samarqand", name_uz: "Samarqand" },
  { id: "sirdaryo", name_uz: "Sirdaryo" },
  { id: "surxondaryo", name_uz: "Surxondaryo" },
  { id: "xorazm", name_uz: "Xorazm" },
  { id: "qoraqalpogiston", name_uz: "Qoraqalpog'iston" },
];

function loadEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) {
    console.error("server/.env topilmadi. cp env.example .env qiling.");
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

await loadEnv();

const TOKEN = (process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_API)?.replace(/^["']|["']$/g, "").trim();
const ENDPOINT = process.env.APPWRITE_ENDPOINT;
const PROJECT = process.env.APPWRITE_PROJECT_ID;
const API_KEY = process.env.APPWRITE_API_KEY?.replace(/^["']|["']$/g, "").trim();
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const ORDERS = process.env.APPWRITE_ORDERS_COLLECTION || "orders";
const DRIVERS = process.env.APPWRITE_DRIVERS_COLLECTION || "drivers";

if (!TOKEN || !ENDPOINT || !PROJECT || !API_KEY || !DATABASE_ID) {
  console.error("TELEGRAM_BOT_TOKEN va Appwrite o'zgaruvchilari to'liq emas.");
  process.exit(1);
}

const aw = new Client().setEndpoint(ENDPOINT).setProject(PROJECT).setKey(API_KEY);
const databases = new Databases(aw);

/** Telegram long polling 45s — Node fetch (undici) default headers timeout yetarli emas. */
const telegramAgent = new Agent({
  connectTimeout: 90_000,
  headersTimeout: 120_000,
  bodyTimeout: 120_000,
});

async function TG(method, body) {
  const res = await undiciFetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
    dispatcher: telegramAgent,
  });
  return res.json();
}

let offset = 0;
const sessions = new Map();
let lastConflictLog = 0;
let lastPollErrLog = 0;
let lastTelegramErrLog = 0;

/** Long polling uchun webhook bo'lsa o'chiriladi. */
async function ensureTelegramPollingMode() {
  const info = await TG("getWebhookInfo", {});
  if (info.ok && info.result?.url) {
    console.log("Webhook faol edi, long polling uchun o'chirilmoqda:", info.result.url);
    await TG("deleteWebhook", { drop_pending_updates: false });
  }
}

function kbRegions() {
  const rows = [];
  for (let i = 0; i < ROUTE_REGIONS.length; i += 2) {
    const row = ROUTE_REGIONS.slice(i, i + 2).map((r) => ({
      text: `Toshkent ↔ ${r.name_uz}`,
      callback_data: `reg:${r.id}`,
    }));
    rows.push(row);
  }
  return { inline_keyboard: rows };
}

/** Pastda kontakt yuborish tugmasi (Telegram kontakti). */
function kbRequestPhone() {
  return {
    keyboard: [[{ text: "📱 Kontaktni yuborish", request_contact: true }]],
    resize_keyboard: true,
    one_time_keyboard: true,
  };
}

function kbRemove() {
  return { remove_keyboard: true };
}

function normalizePhoneFromContact(phone_number) {
  let p = String(phone_number || "").replace(/\s/g, "");
  if (!p) return "";
  if (!p.startsWith("+")) p = `+${p}`;
  return p;
}

async function findDriverByChat(chatId) {
  const res = await databases.listDocuments(DATABASE_ID, DRIVERS, [
    Query.equal("telegram_chat_id", String(chatId)),
    Query.limit(1),
  ]);
  return res.documents[0] ?? null;
}

async function upsertDriver(chatId, { name, phone, remote_region }) {
  const existing = await findDriverByChat(chatId);
  const row = {
    telegram_chat_id: String(chatId),
    name,
    phone,
    remote_region,
    active: true,
    created_at: new Date().toISOString(),
  };
  if (existing) {
    await databases.updateDocument(DATABASE_ID, DRIVERS, existing.$id, {
      name: row.name,
      phone: row.phone,
      remote_region: row.remote_region,
      active: true,
    });
    return existing.$id;
  }
  const created = await databases.createDocument(DATABASE_ID, DRIVERS, ID.unique(), row);
  return created.$id;
}

async function sendText(chatId, text, extra = {}) {
  const hasReplyKeyboard = Boolean(extra.reply_markup?.keyboard);
  const payload = { chat_id: chatId, text, ...extra };
  if (hasReplyKeyboard) {
    delete payload.parse_mode;
  } else if (!extra.parse_mode) {
    payload.parse_mode = "HTML";
  }
  const res = await TG("sendMessage", payload);
  if (!res.ok) {
    console.error("sendMessage:", res.description || res);
  }
  return res;
}

/** ReplyKeyboard (kontakt tugmasi) — HTML parse_mode ishlatilmaydi (Telegram mijozlari uchun ishonchli). */
async function sendReplyKeyboard(chatId, text, reply_markup) {
  const res = await TG("sendMessage", {
    chat_id: chatId,
    text,
    reply_markup,
  });
  if (!res.ok) {
    console.error("sendMessage (reply keyboard):", res.description || res);
  }
  return res;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatDepartureLine(raw) {
  if (!raw) return "—";
  const ms = Date.parse(raw);
  if (Number.isNaN(ms)) return escapeHtml(String(raw));
  return new Date(ms).toLocaleString("uz-UZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatOrderMessage(order) {
  const type = order.tariff === "delivery" ? "Yetkazib berish" : "Taksi";
  const custName = order.customer_name || "—";
  const custPhone = order.customer_phone || "—";
  const dep = formatDepartureLine(order.departure_time);
  return (
    `<b>Yangi buyurtma</b> (${type})\n` +
    `Yo'nalish: ${order.from_region} → ${order.to_region}\n` +
    `Tuman: ${order.from_district || "—"} → ${order.to_district || "—"}\n` +
    `Narx: ${Number(order.price).toLocaleString("uz-UZ")} so'm\n` +
    `<b>Yo'lovchi:</b> ${escapeHtml(custName)}\n` +
    `📞 ${escapeHtml(custPhone)}\n` +
    `🕐 Ketish: ${dep}\n` +
    (order.comment ? `Izoh: ${escapeHtml(order.comment)}\n` : "") +
    `\nID: <code>${order.$id}</code>`
  );
}

async function notifyOrderOnce(order) {
  const remote = getRemoteRegion(order.from_region, order.to_region);
  if (!remote) {
    await databases.updateDocument(DATABASE_ID, ORDERS, order.$id, { drivers_notified: true });
    return;
  }

  const drivers = await databases.listDocuments(DATABASE_ID, DRIVERS, [
    Query.equal("remote_region", remote),
    Query.equal("active", true),
    Query.limit(50),
  ]);

  const text = formatOrderMessage(order);
  const keyboard = {
    inline_keyboard: [[{ text: "✅ Qabul qilish", callback_data: `acc:${order.$id}` }]],
  };

  for (const d of drivers.documents) {
    const cid = d.telegram_chat_id;
    await sendText(cid, text, { reply_markup: keyboard });
  }

  await databases.updateDocument(DATABASE_ID, ORDERS, order.$id, { drivers_notified: true });
}

async function pollNewOrders() {
  try {
    const res = await databases.listDocuments(DATABASE_ID, ORDERS, [
      Query.equal("status", "pending"),
      Query.equal("drivers_notified", false),
      Query.orderAsc("$createdAt"),
      Query.limit(10),
    ]);
    for (const doc of res.documents) {
      await notifyOrderOnce(doc);
    }
  } catch (e) {
    const now = Date.now();
    if (now - lastPollErrLog > 20000) {
      lastPollErrLog = now;
      console.error("pollNewOrders (Appwrite/tarmoq):", e?.cause?.code || e?.message || e);
    }
  }
}

async function handleAccept(chatId, orderId, callbackQueryId) {
  const driver = await findDriverByChat(chatId);
  if (!driver) {
    await TG("answerCallbackQuery", {
      callback_query_id: callbackQueryId,
      text: "Avval ro'yxatdan o'ting: /start",
      show_alert: true,
    });
    return;
  }

  let order;
  try {
    order = await databases.getDocument(DATABASE_ID, ORDERS, orderId);
  } catch {
    await TG("answerCallbackQuery", {
      callback_query_id: callbackQueryId,
      text: "Buyurtma topilmadi",
      show_alert: true,
    });
    return;
  }

  if (order.status !== "pending") {
    await TG("answerCallbackQuery", {
      callback_query_id: callbackQueryId,
      text: "Buyurtma allaqachon boshqa haydovchi tomonidan qabul qilingan",
      show_alert: true,
    });
    return;
  }

  const remote = getRemoteRegion(order.from_region, order.to_region);
  if (!remote || driver.remote_region !== remote) {
    await TG("answerCallbackQuery", {
      callback_query_id: callbackQueryId,
      text: "Bu yo'nalish sizning profilizga mos emas",
      show_alert: true,
    });
    return;
  }

  await databases.updateDocument(DATABASE_ID, ORDERS, orderId, {
    status: "accepted",
    driver_chat_id: String(chatId),
    driver_name: driver.name,
    driver_phone: driver.phone,
  });

  await TG("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text: "Qabul qilindi",
    show_alert: false,
  });
  await sendText(chatId, "Buyurtma sizga biriktirildi. Yo'l bilan!");
}

async function handleMessage(msg) {
  const chatId = msg.chat.id;
  const text = (msg.text || "").trim();

  if (text === "/start" || text === "/help") {
    const d = await findDriverByChat(chatId);
    if (d) {
      sessions.delete(chatId);
      await sendText(
        chatId,
        `Salom, <b>${d.name}</b>!\n` +
          `Yo'nalish: Toshkent ↔ ${d.remote_region}\n` +
          `Tel: ${d.phone}\n\n` +
          `Ma'lumotlarni o'zgartirish uchun yana /start bosing.`,
        { reply_markup: kbRemove() }
      );
      return;
    }
    sessions.set(chatId, { step: "name" });
    await sendText(chatId, "Pitak haydovchi botiga xush kelibsiz.\nTo'liq ismingizni yozing:");
    return;
  }

  const s = sessions.get(chatId);
  if (!s) {
    await sendText(chatId, "/start — ro'yxatdan o'tish.");
    return;
  }

  if (s.step === "name") {
    if (msg.contact) {
      await sendText(chatId, "Ismni matn bilan yozing.");
      return;
    }
    if (text.length < 2) {
      await sendText(chatId, "Ism juda qisqa. Qayta yozing.");
      return;
    }
    s.name = text;
    s.step = "phone";
    await sendText(
      chatId,
      "<b>Telefon</b>\nRaqamni yozing yoki keyingi xabardagi tugma orqali kontakt yuboring.\nMasalan: <code>+998901234567</code>"
    );
    await sendReplyKeyboard(
      chatId,
      "👇 Kontaktni yuborish tugmasini bosing (yoki raqamni shu yerga yozing):",
      kbRequestPhone()
    );
    return;
  }

  if (s.step === "phone") {
    let phone = "";
    if (msg.contact?.phone_number) {
      phone = normalizePhoneFromContact(msg.contact.phone_number);
    } else {
      const raw = text.replace(/\s/g, "");
      if (raw.length >= 9) {
        phone = raw;
        if (!phone.startsWith("+")) {
          const digits = phone.replace(/\D/g, "");
          if (digits.length >= 9)
            phone = digits.startsWith("998") ? `+${digits}` : `+998${digits.replace(/^0+/, "")}`;
        }
      }
    }
    if (!phone || phone.replace(/\D/g, "").length < 9) {
      await sendReplyKeyboard(
        chatId,
        "Telefon noto'g'ri. Raqam yozing yoki tugmani bosing:",
        kbRequestPhone()
      );
      return;
    }
    s.phone = phone;
    s.step = "region";
    await sendText(chatId, "Qaysi viloyat bilan Toshkent o'rtasida ishlaysiz? Pastdagi tugmalardan tanlang:", {
      reply_markup: kbRemove(),
    });
    await sendText(chatId, "Viloyatni tanlang:", { reply_markup: kbRegions() });
    return;
  }
}

async function handleCallback(q) {
  const data = q.data || "";
  const chatId = q.from.id;
  const cqid = q.id;

  if (data.startsWith("reg:")) {
    const id = data.slice(4);
    const r = ROUTE_REGIONS.find((x) => x.id === id);
    if (!r) {
      await TG("answerCallbackQuery", { callback_query_id: cqid, text: "Xato", show_alert: true });
      return;
    }
    const s = sessions.get(chatId);
    if (!s || s.step !== "region" || !s.name || !s.phone) {
      await TG("answerCallbackQuery", {
        callback_query_id: cqid,
        text: "Avval /start bilan qayta boshlang",
        show_alert: true,
      });
      return;
    }
    await upsertDriver(chatId, { name: s.name, phone: s.phone, remote_region: r.name_uz });
    sessions.delete(chatId);
    await TG("answerCallbackQuery", { callback_query_id: cqid, text: "Saqlandi!" });
    await sendText(
      chatId,
      `✅ Ro'yxatdan o'tdingiz.\nYo'nalish: <b>Toshkent ↔ ${r.name_uz}</b>\n` +
        `Yangi buyurtmalar shu yo'nalishda sizga yuboriladi.`
    );
    return;
  }

  if (data.startsWith("acc:")) {
    const orderId = data.slice(4);
    await handleAccept(chatId, orderId, cqid);
  }
}

async function processUpdates(updates) {
  for (const u of updates) {
    offset = u.update_id + 1;
    if (u.message) await handleMessage(u.message);
    if (u.callback_query) await handleCallback(u.callback_query);
  }
}

async function loop() {
  console.log("Bot ishlamoqda. Ctrl+C to'xtatish.");
  await ensureTelegramPollingMode();
  setInterval(pollNewOrders, 8000);

  while (true) {
    try {
      const res = await TG("getUpdates", { offset, timeout: 45, allowed_updates: ["message", "callback_query"] });
      if (!res.ok) {
        if (res.error_code === 409) {
          await TG("deleteWebhook", { drop_pending_updates: false });
          const now = Date.now();
          if (now - lastConflictLog > 25000) {
            lastConflictLog = now;
            console.error(
              "getUpdates 409: bir token bilan faqat bitta jarayon bo'lishi kerak.\n" +
                "  → Barcha boshqa terminal / server / Cursor fon jarayonlarida «npm start» ni to'xtating (Ctrl+C).\n" +
                "  → Keyin faqat bitta joyda qayta ishga tushiring."
            );
          }
          await new Promise((r) => setTimeout(r, 8000));
          continue;
        }
        console.error("getUpdates:", res);
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }
      if (res.result?.length) await processUpdates(res.result);
    } catch (e) {
      const now = Date.now();
      if (now - lastTelegramErrLog > 20000) {
        lastTelegramErrLog = now;
        const code = e?.cause?.code || e?.code;
        console.error(
          "Telegram tarmoq xatosi (getUpdates). VPN / internet / firewall tekshiring.",
          code || e?.message || e
        );
      }
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

loop();
