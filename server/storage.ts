import { db } from "./db";
import { users, generatedApps, projectMessages, passwordResetTokens, releases, type User, type InsertUser, type GeneratedApp, type InsertGeneratedApp, type ProjectMessage, type InsertProjectMessage, type Release, type InsertRelease } from "@shared/schema";
import { eq, desc, sql, and, lt } from "drizzle-orm";
import bcrypt from "bcrypt";
import crypto from "crypto";

function isAdminEmail(email: string): boolean {
  const adminEmails = (process.env.SUPERADMIN_EMAILS || "").toLowerCase().split(",").map(e => e.trim()).filter(Boolean);
  return adminEmails.includes(email.toLowerCase().trim());
}

function isOpenAccessMode(): boolean {
  const raw = (process.env.SELF_HOST_OPEN_ACCESS ?? "true").toLowerCase().trim();
  return raw !== "false" && raw !== "0" && raw !== "no" && raw !== "off";
}

function isPremiumEmail(email: string): boolean {
  const premiumEmails = (process.env.PREMIUM_EMAILS || "").toLowerCase().split(",").map(e => e.trim()).filter(Boolean);
  return premiumEmails.includes(email.toLowerCase().trim());
}

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByStripeCustomerId(customerId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  verifyPassword(password: string, hash: string): Promise<boolean>;
  hashPassword(password: string): Promise<string>;
  getAppsByUser(userId: number): Promise<GeneratedApp[]>;
  getApp(id: number): Promise<GeneratedApp | undefined>;
  getAppByViewToken(viewToken: string): Promise<GeneratedApp | undefined>;
  createApp(app: InsertGeneratedApp): Promise<GeneratedApp>;
  updateApp(id: number, userId: number, data: Partial<GeneratedApp>): Promise<GeneratedApp | undefined>;
  updateAppCode(id: number, userId: number, code: string): Promise<GeneratedApp | undefined>;
  updateAppFiles(id: number, userId: number, files: Record<string, string>, entryFile: string): Promise<GeneratedApp | undefined>;
  finalizeApp(id: number, userId: number, isPublished?: boolean): Promise<GeneratedApp | undefined>;
  getAllApps(): Promise<GeneratedApp[]>;
  getPublishedApps(): Promise<GeneratedApp[]>;
  getProjectMessages(projectId: number): Promise<ProjectMessage[]>;
  addProjectMessage(message: InsertProjectMessage): Promise<ProjectMessage>;
  createPasswordResetToken(userId: number): Promise<string>;
  getPasswordResetToken(token: string): Promise<{ userId: number; expiresAt: Date; used: boolean } | undefined>;
  markResetTokenUsed(token: string): Promise<void>;
  updateUserPassword(userId: number, newPasswordHash: string): Promise<void>;
  syncUserRoles(userId: number, email: string): Promise<User | undefined>;
  getProduct(productId: string): Promise<any>;
  listProducts(active?: boolean): Promise<any[]>;
  getSubscription(subscriptionId: string): Promise<any>;
  createRelease(release: InsertRelease): Promise<Release>;
  getReleasesByProject(projectId: number): Promise<Release[]>;
  getReleasesByUser(userId: number): Promise<Release[]>;
  getReleaseByShareToken(shareToken: string): Promise<Release | undefined>;
}

class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByStripeCustomerId(customerId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, customerId));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await this.hashPassword(insertUser.password);
    const email = insertUser.email.toLowerCase().trim();
    const openAccess = isOpenAccessMode();
    const admin = isAdminEmail(email);
    const premium = openAccess || isPremiumEmail(email);
    const [user] = await db.insert(users).values({
      ...insertUser,
      email,
      password: hashedPassword,
      isAdmin: admin,
      isPro: admin || premium,
    }).returning();
    return user;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user;
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  async getAppsByUser(userId: number): Promise<GeneratedApp[]> {
    return db.select().from(generatedApps)
      .where(eq(generatedApps.userId, userId))
      .orderBy(desc(generatedApps.updatedAt));
  }

  async getApp(id: number): Promise<GeneratedApp | undefined> {
    const [app] = await db.select().from(generatedApps).where(eq(generatedApps.id, id));
    return app;
  }

  async getAppByViewToken(viewToken: string): Promise<GeneratedApp | undefined> {
    const [app] = await db.select().from(generatedApps).where(eq(generatedApps.viewToken, viewToken));
    return app;
  }

  async createApp(app: InsertGeneratedApp): Promise<GeneratedApp> {
    const viewToken = crypto.randomBytes(16).toString("hex");
    const [newApp] = await db.insert(generatedApps).values({
      ...app,
      viewToken,
    }).returning();
    return newApp;
  }

  async updateApp(id: number, userId: number, data: Partial<GeneratedApp>): Promise<GeneratedApp | undefined> {
    const [app] = await db.select().from(generatedApps)
      .where(eq(generatedApps.id, id));
    
    if (!app || app.userId !== userId) {
      return undefined;
    }

    const [updated] = await db.update(generatedApps)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(generatedApps.id, id))
      .returning();
    return updated;
  }

  async updateAppCode(id: number, userId: number, code: string): Promise<GeneratedApp | undefined> {
    const [app] = await db.select().from(generatedApps).where(eq(generatedApps.id, id));
    if (!app || app.userId !== userId) return undefined;

    const [updated] = await db.update(generatedApps)
      .set({ generatedCode: code, updatedAt: new Date() })
      .where(eq(generatedApps.id, id))
      .returning();
    return updated;
  }

  async updateAppFiles(id: number, userId: number, files: Record<string, string>, entryFile: string): Promise<GeneratedApp | undefined> {
    const [app] = await db.select().from(generatedApps).where(eq(generatedApps.id, id));
    if (!app || app.userId !== userId) return undefined;

    const mainCode = files[entryFile] || Object.values(files)[0] || "";
    const [updated] = await db.update(generatedApps)
      .set({
        filesJson: JSON.stringify(files),
        entryFile,
        generatedCode: mainCode,
        updatedAt: new Date(),
      })
      .where(eq(generatedApps.id, id))
      .returning();
    return updated;
  }

  async finalizeApp(id: number, userId: number, isPublished: boolean = false): Promise<GeneratedApp | undefined> {
    const [app] = await db.select().from(generatedApps).where(eq(generatedApps.id, id));
    if (!app || app.userId !== userId) return undefined;

    const [updated] = await db.update(generatedApps)
      .set({ isFinalized: true, isPublished, updatedAt: new Date() })
      .where(eq(generatedApps.id, id))
      .returning();
    return updated;
  }

  async getAllApps(): Promise<GeneratedApp[]> {
    return db.select().from(generatedApps).orderBy(desc(generatedApps.updatedAt));
  }

  async getPublishedApps(): Promise<GeneratedApp[]> {
    return db.select().from(generatedApps)
      .where(eq(generatedApps.isPublished, true))
      .orderBy(desc(generatedApps.updatedAt));
  }

  async getProjectMessages(projectId: number): Promise<ProjectMessage[]> {
    return db.select().from(projectMessages)
      .where(eq(projectMessages.projectId, projectId))
      .orderBy(projectMessages.createdAt);
  }

  async addProjectMessage(message: InsertProjectMessage): Promise<ProjectMessage> {
    const [newMessage] = await db.insert(projectMessages).values(message).returning();
    return newMessage;
  }

  async createPasswordResetToken(userId: number): Promise<string> {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await db.insert(passwordResetTokens).values({ userId, token, expiresAt });
    return token;
  }

  async getPasswordResetToken(token: string) {
    const [row] = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token));
    if (!row) return undefined;
    return { userId: row.userId, expiresAt: row.expiresAt, used: row.used };
  }

  async markResetTokenUsed(token: string): Promise<void> {
    await db.update(passwordResetTokens).set({ used: true }).where(eq(passwordResetTokens.token, token));
  }

  async updateUserPassword(userId: number, newPasswordHash: string): Promise<void> {
    await db.update(users).set({ password: newPasswordHash }).where(eq(users.id, userId));
  }

  async syncUserRoles(userId: number, email: string): Promise<User | undefined> {
    const openAccess = isOpenAccessMode();
    const admin = isAdminEmail(email);
    const premium = openAccess || isPremiumEmail(email);
    const [user] = await db.update(users)
      .set({ isAdmin: admin, isPro: admin || premium })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getProduct(productId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.products WHERE id = ${productId}`
    );
    return result.rows[0] || null;
  }

  async listProducts(active = true) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.products WHERE active = ${active}`
    );
    return result.rows;
  }

  async getSubscription(subscriptionId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.subscriptions WHERE id = ${subscriptionId}`
    );
    return result.rows[0] || null;
  }

  async createRelease(release: InsertRelease): Promise<Release> {
    const [created] = await db.insert(releases).values(release).returning();
    return created;
  }

  async getReleasesByProject(projectId: number): Promise<Release[]> {
    return db.select().from(releases).where(eq(releases.projectId, projectId)).orderBy(desc(releases.createdAt));
  }

  async getReleasesByUser(userId: number): Promise<Release[]> {
    return db.select().from(releases).where(eq(releases.userId, userId)).orderBy(desc(releases.createdAt));
  }

  async getReleaseByShareToken(shareToken: string): Promise<Release | undefined> {
    const [release] = await db.select().from(releases).where(eq(releases.shareToken, shareToken));
    return release;
  }
}

export const storage = new DatabaseStorage();
