import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, integer, timestamp, serial, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  isPro: boolean("is_pro").default(false).notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const generatedApps = pgTable("generated_apps", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  prompt: text("prompt").notNull(),
  generatedCode: text("generated_code").notNull(),
  language: text("language").default("javascript").notNull(),
  appType: text("app_type").default("web").notNull(),
  isPublished: boolean("is_published").default(false).notNull(),
  isFinalized: boolean("is_finalized").default(false).notNull(),
  viewToken: text("view_token"),
  filesJson: text("files_json"),
  entryFile: text("entry_file"),
  framework: text("framework"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const projectMessages = pgTable("project_messages", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => generatedApps.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  messageType: text("message_type").default("chat"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const releases = pgTable("releases", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => generatedApps.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  version: text("version").notNull(),
  shareToken: text("share_token").notNull().unique(),
  notes: text("notes").default(""),
  artifactUrl: text("artifact_url"),
  isPublic: boolean("is_public").default(true).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  isAdmin: true,
  isPro: true,
  stripeCustomerId: true,
  stripeSubscriptionId: true,
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const insertGeneratedAppSchema = createInsertSchema(generatedApps).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  viewToken: true,
  isFinalized: true,
});

export const insertProjectMessageSchema = createInsertSchema(projectMessages).omit({
  id: true,
  createdAt: true,
});

export const insertReleaseSchema = createInsertSchema(releases).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type GeneratedApp = typeof generatedApps.$inferSelect;
export type InsertGeneratedApp = z.infer<typeof insertGeneratedAppSchema>;
export type ProjectMessage = typeof projectMessages.$inferSelect;
export type InsertProjectMessage = z.infer<typeof insertProjectMessageSchema>;
export type Release = typeof releases.$inferSelect;
export type InsertRelease = z.infer<typeof insertReleaseSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;

export type ProjectFiles = Record<string, string>;

export interface AgentStep {
  id: string;
  type: "plan" | "edit" | "create" | "delete" | "command" | "preview";
  description: string;
  status: "pending" | "running" | "done" | "error";
  file?: string;
  diff?: string;
}

export interface AgentResponse {
  steps: AgentStep[];
  files: ProjectFiles;
  entryFile: string;
  summary: string;
}
