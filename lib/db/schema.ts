/**
 * SCHEMA BAZĂ DE DATE - Vibe Budget (PostgreSQL / Supabase)
 *
 * EXPLICAȚIE: Acesta este "planul" bazei noastre de date.
 * Definim ce tabele avem și ce informații stocăm în fiecare.
 *
 * E ca un formular: fiecare coloană este un câmp de completat.
 */

import { pgTable, text, boolean, timestamp, decimal, date } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

/**
 * TABELA 1: USERS (Utilizatori)
 *
 * CE STOCĂM:
 * - id: Identificator unic (ca un CNP digital)
 * - email: Adresa de email (pentru login)
 * - password: Parola criptată (nimeni nu o vede în clar)
 * - name: Numele utilizatorului
 * - nativeCurrency: Moneda nativă (RON sau MDL)
 * - createdAt: Când s-a înregistrat
 */
export const users = pgTable("users", {
  id: text("id")
    .primaryKey(), // ID-ul vine de la Supabase Auth (auth.users.id)
  email: text("email").notNull().unique(), // Email-ul trebuie să fie unic
  name: text("name").notNull(),
  nativeCurrency: text("native_currency").notNull().default("RON"), // RON sau MDL

  createdAt: timestamp("created_at")
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow(),
});

/**
 * TABELA 2: BANKS (Bănci)
 *
 * CE STOCĂM:
 * - id: Identificator unic
 * - userId: La cine aparține banca (legătura cu tabela users)
 * - name: Numele băncii (ING, BCR, Revolut, etc)
 * - color: Culoare pentru identificare vizuală (opțional)
 * - createdAt: Când a fost adăugată
 *
 * EXEMPLU: User Dan adaugă "ING Bank" și "Revolut"
 */
export const banks = pgTable("banks", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }), // Dacă ștergi userul, se șterg și băncile lui
  name: text("name").notNull(),
  color: text("color").default("#6366f1"), // #FF5733 (hex color)
  createdAt: timestamp("created_at")
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow(),
});

/**
 * TABELA 3: CURRENCIES (Valute)
 *
 * CE STOCĂM:
 * - id: Identificator unic
 * - userId: La cine aparține valuta
 * - code: Codul valutar (RON, EUR, USD, MDL)
 * - symbol: Simbolul (lei, €, $)
 * - name: Numele complet (Romanian Leu, Euro, etc)
 * - createdAt: Când a fost adăugată
 *
 * EXEMPLU: User adaugă RON (nativă), EUR, USD
 */
export const currencies = pgTable("currencies", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  code: text("code").notNull(), // RON, EUR, USD, MDL
  name: text("name").notNull(), // Romanian Leu, Euro, US Dollar
  symbol: text("symbol").notNull(), // lei, €, $
  createdAt: timestamp("created_at")
    .notNull()
    .defaultNow(),
});

/**
 * TABELA 4: CATEGORIES (Categorii)
 *
 * CE STOCĂM:
 * - id: Identificator unic
 * - userId: La cine aparține categoria
 * - name: Numele categoriei (Salariu, Chirie, Mâncare, etc)
 * - type: Tipul (income = venit, expense = cheltuială)
 * - color: Culoare pentru grafice
 * - icon: Emoji sau nume de icon (opțional)
 * - isSystemCategory: Dacă e categorie predefinită (nu se poate șterge)
 * - createdAt: Când a fost creată
 *
 * EXEMPLE:
 * - Salariu (income) 💰 [SYSTEM]
 * - Chirie (expense) 🏠 [SYSTEM]
 * - Mâncare (expense) 🍔 [SYSTEM]
 * - Economii (savings) 🐷 [CUSTOM]
 */
export const categories = pgTable("categories", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull().default("expense"), // "income" | "expense"
  color: text("color").default("#6366f1"),
  icon: text("icon").default("📁"), // Emoji sau nume icon
  description: text("description"), // Explicația categoriei (ex: "Benzină, taxi, metrou, parcări")
  isSystemCategory: boolean("is_system_category").default(false), // false = categorie custom, true = categorie predefinită
  createdAt: timestamp("created_at")
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow(),
});

/**
 * TABELA 5: TRANSACTIONS (Tranzacții)
 *
 * CEA MAI IMPORTANTĂ TABELĂ - aici se stochează toate tranzacțiile din extrasele bancare
 *
 * CE STOCĂM:
 * - id: Identificator unic
 * - userId: La cine aparține tranzacția
 * - bankId: Din ce bancă vine (nullable - poate fi PayPal, cash, etc)
 * - categoryId: În ce categorie e (nullable - la început e null, user o categorizează)
 * - date: Data tranzacției (din extras bancar)
 * - description: Descrierea (ce scrie în extrasul bancar)
 * - amount: Suma (cât s-a plătit sau încasat)
 * - currency: Valuta (RON, EUR, USD, etc)
 * - createdAt: Când a fost importată
 *
 * EXEMPLU de tranzacție:
 * {
 *   date: "2025-01-15",
 *   description: "MEGA IMAGE 123",
 *   amount: -45.50,
 *   currency: "RON"
 * }
 */
export const transactions = pgTable("transactions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  bankId: text("bank_id").references(() => banks.id, { onDelete: "set null" }),
  categoryId: text("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  date: date("date", { mode: 'string' }).notNull(), // Data tranzacției (YYYY-MM-DD)
  description: text("description").notNull(), // "MEGA IMAGE 123"
  amount: decimal("amount", { precision: 10, scale: 2, mode: 'number' }).notNull(), // -45.50 (negativ = cheltuială, pozitiv = venit)
  currency: text("currency").notNull().default("RON"), // RON, EUR, USD
  isRecurring: boolean("is_recurring").default(false), // Tranzacție recurentă (Netflix, chirie, etc.)
  createdAt: timestamp("created_at")
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow(),
});

/**
 * TABELA 6: USER_KEYWORDS (Keyword-uri personalizate pentru auto-categorizare)
 *
 * CE STOCĂM:
 * - id: Identificator unic
 * - userId: ID-ul utilizatorului (cine a salvat keyword-ul)
 * - keyword: Cuvântul/fraza cheie (ex: "cofidis", "netflix")
 * - categoryId: ID-ul categoriei asociate
 * - createdAt: Când a fost salvat keyword-ul
 *
 * SCOP:
 * Când utilizatorul categorizează manual o tranzacție, îl întrebăm dacă vrea să
 * salveze merchant-ul/descrierea ca keyword pentru categoria respectivă.
 * La următoarele upload-uri CSV, aplicația va folosi aceste keyword-uri personalizate
 * pentru auto-categorizare (cu prioritate față de regulile globale).
 */
export const userKeywords = pgTable("user_keywords", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }), // Șterge keyword-urile când userul se șterge
  keyword: text("keyword").notNull(), // Ex: "cofidis", "netflix", "mega image"
  categoryId: text("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }), // Șterge keyword-ul când categoria se șterge
  createdAt: timestamp("created_at")
    .notNull()
    .defaultNow(),
});

/**
 * TABELA 7: BUDGETS (Bugete pe categorie)
 *
 * CE STOCĂM:
 * - id: Identificator unic
 * - userId: La cine aparține bugetul
 * - categoryId: Categoria bugetată
 * - amount: Plafonul lunar (ex: 2000 RON)
 * - period: Perioada (monthly)
 */
export const budgets = pgTable("budgets", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  categoryId: text("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 10, scale: 2, mode: 'number' }).notNull(),
  period: text("period").notNull().default("monthly"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * TABELA 8: GOALS (Obiective de economisire)
 *
 * CE STOCĂM:
 * - id: Identificator unic
 * - userId: La cine aparține goal-ul
 * - name: Numele obiectivului (ex: "Vacanță Grecia", "Fond de urgență")
 * - targetAmount: Suma țintă (ex: 5000 RON)
 * - currentAmount: Suma economisită până acum (actualizată manual)
 * - deadline: Data limită (opțional)
 * - icon: Emoji pentru identificare vizuală
 * - color: Culoare pentru progress bar
 * - createdAt: Când a fost creat
 */
export const goals = pgTable("goals", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  targetAmount: decimal("target_amount", { precision: 10, scale: 2, mode: 'number' }).notNull(),
  currentAmount: decimal("current_amount", { precision: 10, scale: 2, mode: 'number' }).notNull().default(0),
  deadline: date("deadline", { mode: 'string' }), // opțional, YYYY-MM-DD
  icon: text("icon").notNull().default("🎯"),
  color: text("color").notNull().default("#14b8a6"),
  savingsMethod: text("savings_method"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * TIPURI TYPESCRIPT
 *
 * Acestea ne ajută să folosim datele în cod cu autocompletare.
 * TypeScript verifică automat că nu facem greșeli.
 */
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Bank = typeof banks.$inferSelect;
export type NewBank = typeof banks.$inferInsert;

export type Currency = typeof currencies.$inferSelect;
export type NewCurrency = typeof currencies.$inferInsert;

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;

export type UserKeyword = typeof userKeywords.$inferSelect;
export type NewUserKeyword = typeof userKeywords.$inferInsert;

export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;

export type Budget = typeof budgets.$inferSelect;
export type NewBudget = typeof budgets.$inferInsert;
