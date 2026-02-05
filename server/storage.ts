import { db } from "./db";
import { users, generatedApps, projectMessages, type User, type InsertUser, type GeneratedApp, type InsertGeneratedApp, type ProjectMessage, type InsertProjectMessage } from "@shared/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import bcrypt from "bcrypt";
import crypto from "crypto";

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
  finalizeApp(id: number, userId: number): Promise<GeneratedApp | undefined>;
  getAllApps(): Promise<GeneratedApp[]>;
  getPublishedApps(): Promise<GeneratedApp[]>;
  getProjectMessages(projectId: number): Promise<ProjectMessage[]>;
  addProjectMessage(message: InsertProjectMessage): Promise<ProjectMessage>;
  getProduct(productId: string): Promise<any>;
  listProducts(active?: boolean): Promise<any[]>;
  getSubscription(subscriptionId: string): Promise<any>;
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
    const isAdminEmail = insertUser.email.toLowerCase() === "elbbucheli@gmail.com";
    const [user] = await db.insert(users).values({
      ...insertUser,
      password: hashedPassword,
      isAdmin: isAdminEmail,
      isPro: isAdminEmail,
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

  async finalizeApp(id: number, userId: number): Promise<GeneratedApp | undefined> {
    const [app] = await db.select().from(generatedApps).where(eq(generatedApps.id, id));
    if (!app || app.userId !== userId) return undefined;

    const [updated] = await db.update(generatedApps)
      .set({ isFinalized: true, isPublished: true, updatedAt: new Date() })
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
}

export const storage = new DatabaseStorage();
