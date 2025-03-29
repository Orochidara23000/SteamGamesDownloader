import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema remains from the original
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Define the Game schema
export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  appId: text("app_id").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  headerImage: text("header_image"),
  price: text("price"),
  releaseDate: text("release_date"),
  genres: json("genres").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertGameSchema = createInsertSchema(games);
export type Game = z.infer<typeof insertGameSchema>;

// Define the Download schema
export const downloads = pgTable("downloads", {
  id: serial("id").primaryKey(),
  appId: text("app_id").notNull().unique(),
  title: text("title").notNull(),
  status: text("status").notNull().default("queued"),
  progress: integer("progress").default(0),
  downloadPath: text("download_path"),
  estimatedSize: text("estimated_size"),
  currentSpeed: text("current_speed"),
  queuePosition: integer("queue_position").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  errorMessage: text("error_message"),
  pausedAt: timestamp("paused_at"),
  completedAt: timestamp("completed_at"),
  steamGuardRequired: boolean("steam_guard_required").default(false),
});

export const insertDownloadSchema = createInsertSchema(downloads);
export type Download = z.infer<typeof insertDownloadSchema>;

// Settings schema
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  downloadPath: text("download_path").notNull(),
  maxConcurrentDownloads: integer("max_concurrent_downloads").default(1),
  compressionFormat: text("compression_format").default("zip"),
  compressionLevel: integer("compression_level").default(6),
  steamCmdPath: text("steam_cmd_path"),
  autoCompress: boolean("auto_compress").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSettingsSchema = createInsertSchema(settings);
export type Settings = z.infer<typeof insertSettingsSchema>;

// Define the Library (installed games) schema
export const library = pgTable("library", {
  id: serial("id").primaryKey(),
  appId: text("app_id").notNull().unique(),
  title: text("title").notNull(),
  installPath: text("install_path").notNull(),
  installSize: text("install_size"),
  installedAt: timestamp("installed_at").defaultNow(),
  lastPlayedAt: timestamp("last_played_at"),
  isCompressed: boolean("is_compressed").default(false),
  compressedPath: text("compressed_path"),
  compressedSize: text("compressed_size"),
  compressionType: text("compression_type"),
  compressionDate: timestamp("compression_date"),
});

export const insertLibrarySchema = createInsertSchema(library);
export type LibraryGame = z.infer<typeof insertLibrarySchema>;

// Download status type
export type DownloadStatus = "queued" | "downloading" | "paused" | "completed" | "failed" | "canceled";

// Compression format type
export type CompressionFormat = "zip" | "tar" | "7z";
