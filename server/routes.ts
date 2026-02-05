import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import MemoryStore from "memorystore";
import OpenAI from "openai";
import multer from "multer";
import { getUncachableStripeClient } from "./stripeClient";
import { loginSchema, insertUserSchema } from "@shared/schema";
import { ZodError } from "zod";
import archiver from "archiver";
import { db } from "./db";
import { generatedApps } from "@shared/schema";
import { transcribeAudio } from "./replit_integrations/audio/transcribe";

const MemoryStoreSession = MemoryStore(session);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

function getOpenAIClient() {
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  
  if (!apiKey) {
    throw new Error("OpenAI API key not configured. Please set AI_INTEGRATIONS_OPENAI_API_KEY or OPENAI_API_KEY environment variable.");
  }
  
  return new OpenAI({
    apiKey,
    baseURL,
  });
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

async function requirePro(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const user = await storage.getUser(req.session.userId);
  if (user?.isAdmin) {
    return next();
  }
  if (!user?.isPro) {
    return res.status(403).json({ error: "Pro subscription required" });
  }
  next();
}

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const user = await storage.getUser(req.session.userId);
  if (!user?.isAdmin) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    console.warn("[auth] SESSION_SECRET not set, using default (not secure for production)");
  }

  app.use(
    session({
      secret: sessionSecret || "nemesis-secret-key-change-in-production",
      resave: false,
      saveUninitialized: false,
      store: new MemoryStoreSession({
        checkPeriod: 86400000,
      }),
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    })
  );

  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);
      
      const existing = await storage.getUserByEmail(data.email);
      if (existing) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const user = await storage.createUser(data);
      req.session.userId = user.id;
      
      const { password: _, ...safeUser } = user;
      res.json({ user: safeUser });
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({ error: err.errors[0]?.message || "Invalid data" });
      }
      console.error("Register error:", err);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(data.email);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const valid = await storage.verifyPassword(data.password, user.password);
      if (!valid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      req.session.userId = user.id;
      
      const { password: _, ...safeUser } = user;
      res.json({ user: safeUser });
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({ error: err.errors[0]?.message || "Invalid data" });
      }
      console.error("Login error:", err);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ ok: true });
    });
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    const { password: _, ...safeUser } = user;
    res.json({ user: safeUser });
  });

  app.get("/api/apps", requireAuth, async (req, res) => {
    try {
      const apps = await storage.getAppsByUser(req.session.userId!);
      res.json(apps);
    } catch (err) {
      console.error("Get apps error:", err);
      res.status(500).json({ error: "Failed to fetch apps" });
    }
  });

  app.post("/api/transcribe", requireAuth, upload.single("audio"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      const text = await transcribeAudio(req.file.buffer);
      res.json({ text });
    } catch (err: any) {
      console.error("[transcribe] Error:", err);
      res.status(500).json({ error: err.message || "Transcription failed" });
    }
  });

  app.post("/api/generate", requireAuth, requirePro, async (req, res) => {
    try {
      const { prompt, name, language } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      let openai: OpenAI;
      try {
        openai = getOpenAIClient();
      } catch (err: any) {
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
        return;
      }

      const systemPrompt = `You are an expert software developer. Generate clean, production-ready ${language || "JavaScript"} code based on the user's description.
      
Rules:
- Only output code, no explanations unless asked
- Use modern best practices
- Include comments for complex logic
- Make the code modular and reusable
- Handle errors appropriately`;

      const stream = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        stream: true,
        max_completion_tokens: 4096,
      });

      let fullCode = "";

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullCode += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      await storage.createApp({
        userId: req.session.userId!,
        name: name || "Untitled App",
        prompt,
        generatedCode: fullCode,
        language: language || "javascript",
      });

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (err: any) {
      console.error("Generate error:", err);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: err.message || "Generation failed" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to generate code" });
      }
    }
  });

  app.post("/api/checkout", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      const stripe = await getUncachableStripeClient();

      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { userId: String(user.id) },
        });
        await storage.updateUser(user.id, { stripeCustomerId: customer.id });
        customerId = customer.id;
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "NemesisAI Pro",
                description: "Unlimited AI-powered app generation with voice control",
              },
              unit_amount: 1900,
              recurring: { interval: "month" },
            },
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${req.protocol}://${req.get("host")}/forge?success=true`,
        cancel_url: `${req.protocol}://${req.get("host")}/pricing?canceled=true`,
      });

      res.json({ url: session.url });
    } catch (err) {
      console.error("Checkout error:", err);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  app.patch("/api/apps/:id", requireAuth, async (req, res) => {
    try {
      const appId = parseInt(req.params.id as string);
      
      if (isNaN(appId)) {
        return res.status(400).json({ error: "Invalid app ID" });
      }

      const { isPublished } = req.body;
      
      if (typeof isPublished !== "boolean") {
        return res.status(400).json({ error: "isPublished must be a boolean" });
      }

      const updated = await storage.updateApp(appId, req.session.userId!, { isPublished });
      
      if (!updated) {
        return res.status(404).json({ error: "App not found or unauthorized" });
      }

      res.json(updated);
    } catch (err) {
      console.error("Update app error:", err);
      res.status(500).json({ error: "Failed to update app" });
    }
  });

  app.post("/api/export-native", requireAuth, requirePro, async (req, res) => {
    try {
      const { code, appName } = req.body;

      if (!code) {
        return res.status(400).json({ error: "Code is required" });
      }

      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename=${(appName || "app").replace(/\s+/g, "-").toLowerCase()}-react-native.zip`);

      const archive = archiver("zip", { zlib: { level: 9 } });
      archive.pipe(res);

      archive.append(JSON.stringify({
        name: appName || "MyApp",
        version: "1.0.0",
        main: "node_modules/expo/AppEntry.js",
        scripts: {
          start: "expo start",
          android: "expo start --android",
          ios: "expo start --ios",
          web: "expo start --web"
        },
        dependencies: {
          "expo": "~49.0.0",
          "expo-status-bar": "~1.6.0",
          "react": "18.2.0",
          "react-native": "0.72.6"
        },
        devDependencies: {
          "@babel/core": "^7.20.0"
        },
        private: true
      }, null, 2), { name: "package.json" });

      archive.append(`import { registerRootComponent } from 'expo';
import App from './App';
registerRootComponent(App);
`, { name: "index.js" });

      archive.append(code, { name: "App.js" });

      archive.append(JSON.stringify({
        expo: {
          name: appName || "MyApp",
          slug: (appName || "myapp").toLowerCase().replace(/\s+/g, "-"),
          version: "1.0.0",
          orientation: "portrait",
          icon: "./assets/icon.png",
          splash: {
            image: "./assets/splash.png",
            resizeMode: "contain",
            backgroundColor: "#0a0a0f"
          },
          ios: {
            supportsTablet: true
          },
          android: {
            adaptiveIcon: {
              foregroundImage: "./assets/adaptive-icon.png",
              backgroundColor: "#0a0a0f"
            }
          },
          web: {
            favicon: "./assets/favicon.png"
          }
        }
      }, null, 2), { name: "app.json" });

      archive.append(`# ${appName || "MyApp"}

Built with NemesisAI - The Ultimate Creator

## Getting Started

1. Install dependencies:
   \`\`\`
   npm install
   \`\`\`

2. Start the development server:
   \`\`\`
   npm start
   \`\`\`

3. Scan the QR code with Expo Go (Android) or Camera (iOS)

## Building for Production

\`\`\`
expo build:android
expo build:ios
\`\`\`
`, { name: "README.md" });

      archive.append("", { name: "assets/.gitkeep" });

      await archive.finalize();
    } catch (err) {
      console.error("Export native error:", err);
      res.status(500).json({ error: "Export failed" });
    }
  });

  app.get("/api/admin/export", requireAuth, requireAdmin, async (req, res) => {
    try {
      const apps = await storage.getAllApps();

      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", "attachment; filename=nemesis-export.zip");

      const archive = archiver("zip", { zlib: { level: 9 } });
      archive.pipe(res);

      for (const app of apps) {
        const filename = `${app.name.replace(/[^a-z0-9]/gi, "_")}_${app.id}.${app.language === "python" ? "py" : "js"}`;
        archive.append(app.generatedCode, { name: `apps/${filename}` });
      }

      const manifest = apps.map((app) => ({
        id: app.id,
        name: app.name,
        language: app.language,
        prompt: app.prompt,
        createdAt: app.createdAt,
      }));
      archive.append(JSON.stringify(manifest, null, 2), { name: "manifest.json" });

      await archive.finalize();
    } catch (err) {
      console.error("Export error:", err);
      res.status(500).json({ error: "Export failed" });
    }
  });

  return httpServer;
}
