import { Client, Account, Databases, Storage } from "appwrite";

const client = new Client()
  .setEndpoint("https://fra.cloud.appwrite.io/v1")
  .setProject("6a019068001ba227d8d6");

const account = new Account(client);
const databases = new Databases(client);
const storage = new Storage(client);

export { client, account, databases, storage };

export const DATABASE_ID = "6a0194f40033833f46c6";
export const COLLECTIONS = {
  USERS: "users",
  REGIONS: "regions",
  DISTRICTS: "districts",
  ORDERS: "orders",
  DRIVERS: "drivers",
  SAVED_PLACES: "saved_places",
  PROMOCODES: "promocodes",
  USER_PROMOCODES: "user_promocodes",
  QUICK_LOCATIONS: "quick_locations",
  PROFILES: "profiles",
} as const;

export const BUCKET_ID = "avatars";
