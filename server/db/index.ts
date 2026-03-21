import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema.js";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "mysql://root:password@localhost:3306/qual_das_tres";

const pool = mysql.createPool(DATABASE_URL);

export const db = drizzle(pool, { schema, mode: "default" });

export { schema };
