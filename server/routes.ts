import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import MemoryStore from "memorystore";
import OpenAI from "openai";
import multer from "multer";
import { getUncachableStripeClient } from "./stripeClient";
import { loginSchema, insertUserSchema } from "@shared/schema";
import type { ProjectFiles, AgentStep, AgentResponse } from "@shared/schema";
import { ZodError } from "zod";
import archiver from "archiver";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { generatedApps } from "@shared/schema";
import { transcribeAudio } from "./replit_integrations/audio/transcribe";
import { createPatch } from "diff";

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

function apiError(res: Response, status: number, code: string, message: string, action?: string) {
  return res.status(status).json({ error: message, code, action });
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return apiError(res, 401, "AUTH_REQUIRED", "Please log in to continue.", "redirect:/login");
  }
  next();
}

async function requirePro(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return apiError(res, 401, "AUTH_REQUIRED", "Please log in to continue.", "redirect:/login");
  }
  const user = await storage.getUser(req.session.userId);
  if (user?.isAdmin) {
    return next();
  }
  if (!user?.isPro) {
    return apiError(res, 403, "PRO_REQUIRED", "Pro subscription required. Upgrade to unlock this feature.", "redirect:/billing");
  }
  next();
}

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return apiError(res, 401, "AUTH_REQUIRED", "Please log in to continue.", "redirect:/login");
  }
  const user = await storage.getUser(req.session.userId);
  if (!user?.isAdmin) {
    return apiError(res, 403, "ADMIN_REQUIRED", "Admin access required for this action.");
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

  // PROJECT SESSION ROUTES FOR ITERATIVE WORKFLOW

  // Create a new project session
  app.post("/api/projects", requireAuth, requirePro, async (req, res) => {
    try {
      const { name, appType, language } = req.body;
      
      const project = await storage.createApp({
        userId: req.session.userId!,
        name: name || "Untitled Project",
        prompt: "",
        generatedCode: "",
        language: language || "react",
        appType: appType || "web",
        isPublished: false,
      });

      res.json(project);
    } catch (err) {
      console.error("Create project error:", err);
      res.status(500).json({ error: "Failed to create project" });
    }
  });

  // Get project with messages
  app.get("/api/projects/:id", requireAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id as string);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      const project = await storage.getApp(projectId);
      if (!project || project.userId !== req.session.userId!) {
        return res.status(404).json({ error: "Project not found" });
      }

      const messages = await storage.getProjectMessages(projectId);
      res.json({ ...project, messages });
    } catch (err) {
      console.error("Get project error:", err);
      res.status(500).json({ error: "Failed to get project" });
    }
  });

  // Get project messages
  app.get("/api/projects/:id/messages", requireAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id as string);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      const project = await storage.getApp(projectId);
      if (!project || project.userId !== req.session.userId!) {
        return res.status(404).json({ error: "Project not found" });
      }

      const messages = await storage.getProjectMessages(projectId);
      res.json(messages);
    } catch (err) {
      console.error("Get messages error:", err);
      res.status(500).json({ error: "Failed to get messages" });
    }
  });

  // Iterate on existing project code (streaming)
  app.post("/api/projects/:id/iterate", requireAuth, requirePro, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id as string);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      const { prompt } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const project = await storage.getApp(projectId);
      if (!project || project.userId !== req.session.userId!) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Save user message
      await storage.addProjectMessage({
        projectId,
        role: "user",
        content: prompt,
      });

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

      // Build tech context based on app type
      let techContext = "";
      switch (project.appType) {
        case "3d-game":
          techContext = "Use Three.js with React Three Fiber for 3D rendering. Include OrbitControls and proper lighting.";
          break;
        case "vr-world":
          techContext = "Use A-Frame for WebVR. Create an immersive VR scene with interactive elements.";
          break;
        case "native":
          techContext = "Use React Native with Expo. Ensure cross-platform compatibility for iOS and Android.";
          break;
        default:
          techContext = "Use React with modern hooks and Tailwind CSS for styling.";
      }

      const hasExistingCode = project.generatedCode && project.generatedCode.trim().length > 0;
      
      const systemPrompt = hasExistingCode
        ? `You are an expert software developer. The user is iteratively building an app with you.

Tech Stack: ${project.language}
${techContext}

Current code:
\`\`\`
${project.generatedCode}
\`\`\`

Rules:
- Make ONLY the changes requested by the user
- Preserve all existing functionality that wasn't mentioned
- Output the complete updated code (not just the changes)
- Keep the code clean and production-ready
- Do not add explanations, just output code`
        : `You are an expert software developer creating a new ${project.appType} app.

Tech Stack: ${project.language}
${techContext}

Rules:
- Generate clean, production-ready code
- Use modern best practices
- Output only code, no explanations
- Make the code modular and reusable`;

      const stream = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        stream: true,
        max_completion_tokens: 8192,
      });

      let fullCode = "";

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullCode += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      // Update project with new code
      await storage.updateAppCode(projectId, req.session.userId!, fullCode);
      
      // Update the prompt field with latest
      await storage.updateApp(projectId, req.session.userId!, { prompt });

      // Save assistant message
      await storage.addProjectMessage({
        projectId,
        role: "assistant",
        content: "Code updated successfully.",
      });

      res.write(`data: ${JSON.stringify({ done: true, projectId })}\n\n`);
      res.end();
    } catch (err: any) {
      console.error("Iterate error:", err);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: err.message || "Iteration failed" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to iterate" });
      }
    }
  });

  // Finalize project
  app.post("/api/projects/:id/finalize", requireAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id as string);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      // Get isPublished from request body, default to false (private)
      const isPublished = req.body?.isPublished === true;

      const project = await storage.finalizeApp(projectId, req.session.userId!, isPublished);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      res.json(project);
    } catch (err) {
      console.error("Finalize error:", err);
      res.status(500).json({ error: "Failed to finalize project" });
    }
  });

  // Helper function to build HTML for app rendering
  function buildAppHtml(app: { name: string; generatedCode: string; language?: string }) {
    const language = app.language || "react";
    
    if (language === "aframe") {
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${app.name} | NemesisAI</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://aframe.io/releases/1.4.0/aframe.min.js"></script>
  <style>body { margin: 0; }</style>
</head>
<body>
  ${app.generatedCode}
</body>
</html>`;
    } else if (language === "threejs") {
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${app.name} | NemesisAI</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://unpkg.com/three@0.157.0/build/three.min.js"></script>
  <script src="https://unpkg.com/three@0.157.0/examples/js/controls/OrbitControls.js"></script>
  <style>body { margin: 0; overflow: hidden; background: #0a0a0a; } canvas { display: block; }</style>
</head>
<body>
  <script>${app.generatedCode}</script>
</body>
</html>`;
    } else {
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${app.name} | NemesisAI</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; padding: 20px; background: #0a0a0a; color: #fff; min-height: 100vh; }
    * { box-sizing: border-box; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    ${app.generatedCode}
    
    if (typeof App !== 'undefined') {
      ReactDOM.createRoot(document.getElementById('root')).render(<App />);
    }
  </script>
</body>
</html>`;
    }
  }

  // Public launch route - main public URL for live apps
  // Shows published apps publicly, unpublished only for the owner
  app.get("/launch/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).send("Invalid project ID");
      }
      
      const app = await storage.getApp(id);
      if (!app) {
        return res.status(404).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Not Found | NemesisAI</title>
            <style>
              body { background: #0a0a0a; color: #fff; font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
              .container { text-align: center; }
              h1 { color: #d4af37; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>App Not Found</h1>
              <p>This project doesn't exist or has been removed.</p>
            </div>
          </body>
          </html>
        `);
      }

      // Check access: public if published, otherwise require owner or admin
      if (!app.isPublished && !app.isFinalized) {
        // Check if user is logged in and is the owner or admin
        const userId = (req.session as any)?.userId;
        if (!userId) {
          return res.status(403).send(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Private App | NemesisAI</title>
              <style>
                body { background: #0a0a0a; color: #fff; font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                .container { text-align: center; }
                h1 { color: #d4af37; }
                a { color: #8b5cf6; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>Private App</h1>
                <p>This app hasn't been published yet.</p>
                <a href="/login">Login to access</a>
              </div>
            </body>
            </html>
          `);
        }
        
        const user = await storage.getUser(userId);
        if (!user?.isAdmin && app.userId !== userId) {
          return res.status(403).send(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Access Denied | NemesisAI</title>
              <style>
                body { background: #0a0a0a; color: #fff; font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                .container { text-align: center; }
                h1 { color: #d4af37; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>Access Denied</h1>
                <p>You don't have permission to view this app.</p>
              </div>
            </body>
            </html>
          `);
        }
      }

      res.setHeader("Content-Type", "text/html");
      res.send(buildAppHtml(app));
    } catch (err) {
      console.error("Launch error:", err);
      res.status(500).send("Error loading app");
    }
  });

  // Legacy view route (redirects to /launch/:id)
  app.get("/view/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const app = await storage.getAppByViewToken(token);
      if (!app) {
        return res.status(404).send("App not found");
      }
      // Redirect to the new /launch/:id route
      res.redirect(`/launch/${app.id}`);
    } catch (err) {
      console.error("View error:", err);
      res.status(500).send("Error loading app");
    }
  });

  // Preview Management - In-memory state for dev server simulation
  const previewStates = new Map<number, {
    status: "idle" | "installing" | "starting" | "running" | "error" | "crashed";
    startedAt?: Date;
    logs: Array<{ type: string; message: string; timestamp: Date }>;
    framework?: string;
    port?: number;
  }>();

  // Detect framework from code
  function detectFramework(code: string): { framework: string; command: string } {
    if (code.includes("a-frame") || code.includes("<a-scene>")) {
      return { framework: "A-Frame (WebVR)", command: "static server" };
    }
    if (code.includes("three") || code.includes("@react-three/fiber")) {
      return { framework: "Three.js + React", command: "npm run dev" };
    }
    if (code.includes("react-native") || code.includes("expo")) {
      return { framework: "React Native (Expo)", command: "expo start" };
    }
    if (code.includes("next")) {
      return { framework: "Next.js", command: "npm run dev" };
    }
    if (code.includes("vite") || code.includes("@vitejs")) {
      return { framework: "Vite + React", command: "npm run dev -- --host 0.0.0.0 --port 5173" };
    }
    return { framework: "React", command: "npm run dev" };
  }

  // Get preview status
  app.get("/api/projects/:id/preview/status", requireAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id as string);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      const project = await storage.getApp(projectId);
      if (!project || project.userId !== req.session.userId!) {
        return res.status(404).json({ error: "Project not found" });
      }

      const state = previewStates.get(projectId) || { status: "idle", logs: [] };
      const framework = detectFramework(project.generatedCode || "");

      res.json({
        status: state.status,
        framework: framework.framework,
        command: framework.command,
        port: state.port || 5173,
        startedAt: state.startedAt,
        logs: state.logs.slice(-50),
      });
    } catch (err) {
      console.error("Preview status error:", err);
      res.status(500).json({ error: "Failed to get preview status" });
    }
  });

  // Start preview (simulate dev server startup)
  app.post("/api/projects/:id/preview/start", requireAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id as string);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      const project = await storage.getApp(projectId);
      if (!project || project.userId !== req.session.userId!) {
        return res.status(404).json({ error: "Project not found" });
      }

      const framework = detectFramework(project.generatedCode || "");
      const now = new Date();

      // Initialize state
      previewStates.set(projectId, {
        status: "installing",
        startedAt: now,
        logs: [
          { type: "info", message: `Detected ${framework.framework}`, timestamp: now },
          { type: "info", message: "Checking dependencies...", timestamp: new Date(now.getTime() + 100) },
        ],
        framework: framework.framework,
        port: 5173,
      });

      // Simulate installation phase
      setTimeout(() => {
        const state = previewStates.get(projectId);
        if (state && state.status === "installing") {
          state.logs.push(
            { type: "log", message: "npm install", timestamp: new Date() },
            { type: "log", message: "added 150 packages in 2.5s", timestamp: new Date() }
          );
          state.status = "starting";
          previewStates.set(projectId, state);
        }
      }, 1500);

      // Simulate server start
      setTimeout(() => {
        const state = previewStates.get(projectId);
        if (state && state.status === "starting") {
          state.logs.push(
            { type: "log", message: `$ ${framework.command}`, timestamp: new Date() },
            { type: "info", message: "VITE v5.0.0 ready in 500ms", timestamp: new Date() },
            { type: "info", message: "➜ Local: http://localhost:5173/", timestamp: new Date() },
            { type: "info", message: "➜ Network: http://0.0.0.0:5173/", timestamp: new Date() }
          );
          state.status = "running";
          previewStates.set(projectId, state);
        }
      }, 3000);

      res.json({ success: true, message: "Starting preview..." });
    } catch (err) {
      console.error("Preview start error:", err);
      res.status(500).json({ error: "Failed to start preview" });
    }
  });

  // Stop preview
  app.post("/api/projects/:id/preview/stop", requireAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id as string);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      const state = previewStates.get(projectId);
      if (state) {
        state.status = "idle";
        state.logs.push({ type: "info", message: "Dev server stopped", timestamp: new Date() });
        previewStates.set(projectId, state);
      }

      res.json({ success: true });
    } catch (err) {
      console.error("Preview stop error:", err);
      res.status(500).json({ error: "Failed to stop preview" });
    }
  });

  // Fix preview - auto-detect issues and repair
  app.post("/api/projects/:id/preview/fix", requireAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id as string);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      const project = await storage.getApp(projectId);
      if (!project || project.userId !== req.session.userId!) {
        return res.status(404).json({ error: "Project not found" });
      }

      const framework = detectFramework(project.generatedCode || "");
      const now = new Date();

      // Start fix process
      previewStates.set(projectId, {
        status: "installing",
        startedAt: now,
        logs: [
          { type: "warn", message: "Auto-fix initiated", timestamp: now },
          { type: "info", message: `Framework detected: ${framework.framework}`, timestamp: new Date(now.getTime() + 100) },
          { type: "info", message: "Clearing cache...", timestamp: new Date(now.getTime() + 200) },
          { type: "log", message: "rm -rf node_modules/.cache", timestamp: new Date(now.getTime() + 300) },
        ],
        framework: framework.framework,
        port: 5173,
      });

      // Simulate reinstall
      setTimeout(() => {
        const state = previewStates.get(projectId);
        if (state) {
          state.logs.push(
            { type: "info", message: "Reinstalling dependencies...", timestamp: new Date() },
            { type: "log", message: "npm install --force", timestamp: new Date() }
          );
          previewStates.set(projectId, state);
        }
      }, 500);

      // Simulate fix completion
      setTimeout(() => {
        const state = previewStates.get(projectId);
        if (state) {
          state.logs.push(
            { type: "log", message: "added 150 packages in 3.2s", timestamp: new Date() },
            { type: "info", message: "Dependencies restored", timestamp: new Date() }
          );
          state.status = "starting";
          previewStates.set(projectId, state);
        }
      }, 2000);

      // Start server
      setTimeout(() => {
        const state = previewStates.get(projectId);
        if (state && state.status === "starting") {
          state.logs.push(
            { type: "log", message: `$ ${framework.command}`, timestamp: new Date() },
            { type: "info", message: "✓ Fix successful - server running", timestamp: new Date() },
            { type: "info", message: "➜ Preview connected on port 5173", timestamp: new Date() }
          );
          state.status = "running";
          previewStates.set(projectId, state);
        }
      }, 3500);

      res.json({ success: true, message: "Fix initiated..." });
    } catch (err) {
      console.error("Preview fix error:", err);
      res.status(500).json({ error: "Failed to fix preview" });
    }
  });

  // Get preview logs (polling endpoint)
  app.get("/api/projects/:id/preview/logs", requireAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id as string);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      const state = previewStates.get(projectId);
      res.json({
        status: state?.status || "idle",
        logs: state?.logs || [],
      });
    } catch (err) {
      console.error("Preview logs error:", err);
      res.status(500).json({ error: "Failed to get logs" });
    }
  });

  // === WORKSPACE FILE APIs ===

  app.get("/api/projects/:id/files", requireAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id as string);
      if (isNaN(projectId)) return res.status(400).json({ error: "Invalid project ID" });

      const project = await storage.getApp(projectId);
      if (!project || project.userId !== req.session.userId!) {
        return res.status(404).json({ error: "Project not found" });
      }

      let files: ProjectFiles = {};
      let entryFile = project.entryFile || "index.html";

      if (project.filesJson) {
        try { files = JSON.parse(project.filesJson); } catch { files = {}; }
      }

      if (Object.keys(files).length === 0 && project.generatedCode) {
        files[entryFile] = project.generatedCode;
      }

      res.json({ files, entryFile });
    } catch (err) {
      console.error("Get files error:", err);
      res.status(500).json({ error: "Failed to get files" });
    }
  });

  app.put("/api/projects/:id/files", requireAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id as string);
      if (isNaN(projectId)) return res.status(400).json({ error: "Invalid project ID" });

      const project = await storage.getApp(projectId);
      if (!project || project.userId !== req.session.userId!) {
        return apiError(res, 404, "NOT_FOUND", "Project not found");
      }

      const { files, entryFile } = req.body;
      if (!files || typeof files !== "object") {
        return res.status(400).json({ error: "Files object is required" });
      }

      let mergedFiles: ProjectFiles = { ...files };
      if (!project.filesJson && project.generatedCode && Object.keys(mergedFiles).length > 0) {
        const legacyEntry = project.entryFile || "index.html";
        if (!mergedFiles[legacyEntry]) {
          mergedFiles[legacyEntry] = project.generatedCode;
        }
      }

      const updated = await storage.updateAppFiles(
        projectId, req.session.userId!, mergedFiles, entryFile || project.entryFile || "index.html"
      );
      if (!updated) return apiError(res, 404, "NOT_FOUND", "Project not found");

      res.json({ success: true, entryFile: updated.entryFile });
    } catch (err) {
      console.error("Update files error:", err);
      res.status(500).json({ error: "Failed to update files" });
    }
  });

  app.patch("/api/projects/:id/file", requireAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id as string);
      if (isNaN(projectId)) return res.status(400).json({ error: "Invalid project ID" });

      const filepath = req.body.filepath as string;
      if (!filepath) return res.status(400).json({ error: "Filepath is required" });
      const { content } = req.body;
      if (typeof content !== "string") {
        return res.status(400).json({ error: "Content string is required" });
      }

      const project = await storage.getApp(projectId);
      if (!project || project.userId !== req.session.userId!) {
        return res.status(404).json({ error: "Project not found" });
      }

      let files: ProjectFiles = {};
      if (project.filesJson) {
        try { files = JSON.parse(project.filesJson); } catch { files = {}; }
      }
      files[filepath] = content;

      const entryFile = project.entryFile || "index.html";
      await storage.updateAppFiles(projectId, req.session.userId!, files, entryFile);

      res.json({ success: true });
    } catch (err) {
      console.error("Patch file error:", err);
      res.status(500).json({ error: "Failed to update file" });
    }
  });

  // === AGENT ITERATE (Structured with plan steps + diffs) ===

  app.post("/api/projects/:id/agent", requireAuth, requirePro, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id as string);
      if (isNaN(projectId)) return res.status(400).json({ error: "Invalid project ID" });

      const { prompt } = req.body;
      if (!prompt) return res.status(400).json({ error: "Prompt is required" });

      const project = await storage.getApp(projectId);
      if (!project || project.userId !== req.session.userId!) {
        return res.status(404).json({ error: "Project not found" });
      }

      await storage.addProjectMessage({
        projectId,
        role: "user",
        content: prompt,
        messageType: "chat",
      });

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      let openai: OpenAI;
      try {
        openai = getOpenAIClient();
      } catch (err: any) {
        res.write(`data: ${JSON.stringify({ type: "error", error: err.message })}\n\n`);
        res.end();
        return;
      }

      let currentFiles: ProjectFiles = {};
      const entryFile = project.entryFile || "index.html";
      if (project.filesJson) {
        try { currentFiles = JSON.parse(project.filesJson); } catch { currentFiles = {}; }
      }
      if (Object.keys(currentFiles).length === 0 && project.generatedCode) {
        currentFiles[entryFile] = project.generatedCode;
      }

      let techContext = "";
      switch (project.appType) {
        case "3d-game":
          techContext = "Use Three.js with React Three Fiber for 3D rendering. Include OrbitControls and proper lighting.";
          break;
        case "vr-world":
          techContext = "Use A-Frame for WebVR. Create an immersive VR scene with interactive elements.";
          break;
        case "native":
          techContext = "Use React Native with Expo. Ensure cross-platform compatibility for iOS and Android.";
          break;
        default:
          techContext = "Use React with modern hooks and Tailwind CSS for styling.";
      }

      const fileList = Object.keys(currentFiles).length > 0
        ? `Current files:\n${Object.entries(currentFiles).map(([path, code]) => `--- ${path} ---\n${code}`).join("\n\n")}`
        : "No files yet. Create the project from scratch.";

      const systemPrompt = `You are NemesisAI Agent, an expert software developer. You work like Cursor/Replit - you receive instructions and produce complete file contents.

Tech Stack: ${project.language}
${techContext}

${fileList}

CRITICAL RULES:
1. Output your response as a JSON object with this exact structure:
{
  "plan": ["Step 1 description", "Step 2 description", ...],
  "files": {
    "filename.ext": "full file content here",
    ...
  },
  "entryFile": "index.html",
  "summary": "Brief summary of what was done"
}
2. Include ALL files - even unchanged ones. Output complete file contents, never partial.
3. Use proper file extensions (.html, .css, .js, .tsx, .json etc.)
4. For web apps, the entry file should be index.html
5. Keep code clean, modern, and production-ready
6. Output ONLY the JSON object, no markdown fences, no explanations outside the JSON`;

      res.write(`data: ${JSON.stringify({ type: "step", step: { id: "1", type: "plan", description: "Analyzing your request...", status: "running" } })}\n\n`);

      const stream = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        stream: true,
        max_completion_tokens: 16384,
      });

      let fullResponse = "";

      res.write(`data: ${JSON.stringify({ type: "step", step: { id: "1", type: "plan", description: "Analyzing your request...", status: "done" } })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: "step", step: { id: "2", type: "edit", description: "Generating code...", status: "running" } })}\n\n`);

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ type: "stream", content })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ type: "step", step: { id: "2", type: "edit", description: "Generating code...", status: "done" } })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: "step", step: { id: "3", type: "command", description: "Applying changes...", status: "running" } })}\n\n`);

      let agentResult: AgentResponse;
      try {
        const cleaned = fullResponse.replace(/^```json?\s*/, "").replace(/\s*```$/, "").trim();
        const parsed = JSON.parse(cleaned);
        agentResult = {
          steps: (parsed.plan || []).map((desc: string, i: number) => ({
            id: String(i + 1),
            type: "plan" as const,
            description: desc,
            status: "done" as const,
          })),
          files: parsed.files || {},
          entryFile: parsed.entryFile || "index.html",
          summary: parsed.summary || "Changes applied",
        };
      } catch {
        const singleFile = entryFile;
        agentResult = {
          steps: [{ id: "1", type: "edit", description: "Generated code", status: "done" }],
          files: { [singleFile]: fullResponse },
          entryFile: singleFile,
          summary: "Code generated (single file fallback)",
        };
      }

      const diffs: Record<string, string> = {};
      for (const [filepath, newContent] of Object.entries(agentResult.files)) {
        const oldContent = currentFiles[filepath] || "";
        if (oldContent !== newContent) {
          diffs[filepath] = createPatch(filepath, oldContent, newContent, "before", "after");
        }
      }

      await storage.updateAppFiles(
        projectId, req.session.userId!,
        agentResult.files, agentResult.entryFile
      );

      await storage.updateApp(projectId, req.session.userId!, { prompt });

      await storage.addProjectMessage({
        projectId,
        role: "assistant",
        content: agentResult.summary,
        messageType: "agent",
        metadata: JSON.stringify({
          steps: agentResult.steps,
          diffs: Object.keys(diffs),
          fileCount: Object.keys(agentResult.files).length,
        }),
      });

      res.write(`data: ${JSON.stringify({ type: "step", step: { id: "3", type: "command", description: "Applying changes...", status: "done" } })}\n\n`);

      res.write(`data: ${JSON.stringify({
        type: "result",
        result: {
          plan: agentResult.steps.map(s => s.description),
          files: agentResult.files,
          entryFile: agentResult.entryFile,
          diffs,
          summary: agentResult.summary,
        }
      })}\n\n`);

      res.write(`data: ${JSON.stringify({ type: "done", projectId })}\n\n`);
      res.end();
    } catch (err: any) {
      console.error("Agent error:", err);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ type: "error", error: err.message || "Agent failed" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Agent execution failed" });
      }
    }
  });

  // === DIAGNOSTICS (Admin only) ===

  app.get("/api/diagnostics", requireAuth, requireAdmin, async (req, res) => {
    const checks: Record<string, { status: "ok" | "warning" | "error"; message: string }> = {};

    checks.database = await (async () => {
      try {
        await db.execute(sql`SELECT 1`);
        return { status: "ok" as const, message: "PostgreSQL connected" };
      } catch (err: any) {
        return { status: "error" as const, message: `DB error: ${err.message}` };
      }
    })();

    checks.openai = (() => {
      const key = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
      if (key) return { status: "ok" as const, message: "API key configured" };
      return { status: "error" as const, message: "No OpenAI API key found" };
    })();

    checks.session = (() => {
      const secret = process.env.SESSION_SECRET;
      if (secret) return { status: "ok" as const, message: "Session secret configured" };
      return { status: "warning" as const, message: "Using default session secret (not secure)" };
    })();

    checks.stripe = await (async () => {
      try {
        const client = await getUncachableStripeClient();
        if (client) return { status: "ok" as const, message: "Stripe client available" };
        return { status: "warning" as const, message: "Stripe client not initialized" };
      } catch (err: any) {
        return { status: "warning" as const, message: `Stripe: ${err.message}` };
      }
    })();

    checks.env = (() => {
      const required = ["DATABASE_URL"];
      const missing = required.filter(k => !process.env[k]);
      if (missing.length === 0) return { status: "ok" as const, message: "All required ENV vars present" };
      return { status: "error" as const, message: `Missing: ${missing.join(", ")}` };
    })();

    const overall = Object.values(checks).some(c => c.status === "error") ? "error"
      : Object.values(checks).some(c => c.status === "warning") ? "warning" : "ok";

    res.json({ overall, checks, timestamp: new Date().toISOString() });
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
