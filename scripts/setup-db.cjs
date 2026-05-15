const sdk = require("node-appwrite");

const API_KEY = process.env.APPWRITE_API_KEY;
if (!API_KEY) {
  console.error("APPWRITE_API_KEY environment variable required");
  process.exit(1);
}

const client = new sdk.Client()
  .setEndpoint("https://fra.cloud.appwrite.io/v1")
  .setProject("6a019068001ba227d8d6")
  .setKey(API_KEY);

const databases = new sdk.Databases(client);
const storageSDK = new sdk.Storage(client);
const DB = "6a0194f40033833f46c6";
const BUCKET_ID = "avatars";

const collections = [
  {
    id: "regions",
    name: "Regions",
    attrs: [
      { key: "name_uz", type: "string", size: 255, required: true },
      { key: "name_ru", type: "string", size: 255, required: true },
      { key: "is_new", type: "boolean", required: false, default: false },
    ],
  },
  {
    id: "districts",
    name: "Districts",
    attrs: [
      { key: "region_id", type: "string", size: 255, required: true },
      { key: "name_uz", type: "string", size: 255, required: true },
      { key: "name_ru", type: "string", size: 255, required: true },
      { key: "is_new", type: "boolean", required: false, default: false },
    ],
  },
  {
    id: "orders",
    name: "Orders",
    attrs: [
      { key: "user_id", type: "string", size: 255, required: true },
      { key: "from_region", type: "string", size: 255, required: true },
      { key: "from_district", type: "string", size: 255, required: false },
      { key: "to_region", type: "string", size: 255, required: true },
      { key: "to_district", type: "string", size: 255, required: true },
      { key: "tariff", type: "string", size: 50, required: true },
      { key: "seats", type: "integer", required: true },
      { key: "price", type: "integer", required: true },
      { key: "gender_pref", type: "string", size: 50, required: true },
      { key: "comment", type: "string", size: 1000, required: false },
      { key: "status", type: "string", size: 50, required: true },
      { key: "created_at", type: "string", size: 50, required: true },
    ],
  },
  {
    id: "saved_places",
    name: "Saved Places",
    attrs: [
      { key: "user_id", type: "string", size: 255, required: true },
      { key: "name", type: "string", size: 500, required: true },
      { key: "region_id", type: "string", size: 255, required: true },
      { key: "district_id", type: "string", size: 255, required: true },
      { key: "created_at", type: "string", size: 50, required: true },
    ],
  },
  {
    id: "promocodes",
    name: "Promocodes",
    attrs: [
      { key: "code", type: "string", size: 50, required: true },
      { key: "discount_percent", type: "integer", required: true },
      { key: "is_active", type: "boolean", required: true, default: true },
      { key: "expires_at", type: "string", size: 50, required: true },
    ],
  },
  {
    id: "user_promocodes",
    name: "User Promocodes",
    attrs: [
      { key: "user_id", type: "string", size: 255, required: true },
      { key: "promocode_id", type: "string", size: 255, required: true },
      { key: "used_at", type: "string", size: 50, required: true },
    ],
  },
  {
    id: "quick_locations",
    name: "Quick Locations",
    attrs: [
      { key: "user_id", type: "string", size: 255, required: true },
      { key: "type", type: "string", size: 20, required: true },
      { key: "lat", type: "float", required: true },
      { key: "lng", type: "float", required: true },
      { key: "address", type: "string", size: 500, required: true },
    ],
  },
  {
    id: "profiles",
    name: "Profiles",
    attrs: [
      { key: "user_id", type: "string", size: 255, required: true },
      { key: "phone", type: "string", size: 50, required: false },
      { key: "avatar_id", type: "string", size: 255, required: false },
    ],
  },
];

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function createAttr(collId, attr) {
  if (attr.type === "string") {
    await databases.createStringAttribute(DB, collId, attr.key, attr.size, attr.required, attr.default || undefined);
  } else if (attr.type === "integer") {
    await databases.createIntegerAttribute(DB, collId, attr.key, attr.required);
  } else if (attr.type === "float") {
    await databases.createFloatAttribute(DB, collId, attr.key, attr.required);
  } else if (attr.type === "boolean") {
    await databases.createBooleanAttribute(DB, collId, attr.key, attr.required, attr.default || undefined);
  }
}

async function main() {
  for (const col of collections) {
    try {
      console.log(`Creating collection: ${col.name} (${col.id})...`);
      await databases.createCollection(DB, col.id, col.name, [
        sdk.Permission.read(sdk.Role.users()),
        sdk.Permission.create(sdk.Role.users()),
        sdk.Permission.update(sdk.Role.users()),
        sdk.Permission.delete(sdk.Role.users()),
      ]);
      console.log(`  ✓ Collection created`);
    } catch (e) {
      if (e.code === 409) {
        console.log(`  ⚠ Already exists, skipping`);
      } else {
        console.error(`  ✗ Error:`, e.message);
        continue;
      }
    }

    for (const attr of col.attrs) {
      try {
        console.log(`  Adding attribute: ${attr.key} (${attr.type})...`);
        await createAttr(col.id, attr);
        console.log(`    ✓ OK`);
      } catch (e) {
        if (e.code === 409) {
          console.log(`    ⚠ Already exists`);
        } else {
          console.error(`    ✗ Error:`, e.message);
        }
      }
      await sleep(1500);
    }
    console.log("");
  }

  console.log("✅ All collections and attributes created!");

  // Create avatars storage bucket
  try {
    console.log(`Creating storage bucket: avatars...`);
    await storageSDK.createBucket(BUCKET_ID, "Avatars", [
      sdk.Permission.read(sdk.Role.users()),
      sdk.Permission.create(sdk.Role.users()),
      sdk.Permission.update(sdk.Role.users()),
      sdk.Permission.delete(sdk.Role.users()),
    ], false, true, 5 * 1024 * 1024, ["image/jpeg", "image/png", "image/webp", "image/gif"]);
    console.log(`  ✓ Bucket created`);
  } catch (e) {
    if (e.code === 409) {
      console.log(`  ⚠ Bucket already exists`);
    } else {
      console.error(`  ✗ Bucket error:`, e.message);
    }
  }

  console.log("\n🎉 Setup complete!");
}

main().catch(console.error);
