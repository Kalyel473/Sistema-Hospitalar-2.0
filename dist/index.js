// server/index.ts
import express2 from "express";
import session3 from "express-session";

// server/storage.ts
import session from "express-session";
import createMemoryStore from "memorystore";
var MemoryStore = createMemoryStore(session);
var MemStorage = class {
  users;
  clients;
  equipments;
  cleaningSteps;
  sessionStore;
  userCurrentId;
  clientCurrentId;
  equipmentCurrentId;
  cleaningStepCurrentId;
  constructor() {
    this.users = /* @__PURE__ */ new Map();
    this.clients = /* @__PURE__ */ new Map();
    this.equipments = /* @__PURE__ */ new Map();
    this.cleaningSteps = /* @__PURE__ */ new Map();
    this.userCurrentId = 1;
    this.clientCurrentId = 1;
    this.equipmentCurrentId = 1;
    this.cleaningStepCurrentId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 864e5
      // 24 hours
    });
    this.createInitialData();
  }
  // Initialize with some data for development
  async createInitialData() {
    this.createClient({
      name: "Hospital Santa Clara",
      email: "contato@santaclara.com.br",
      phone: "(11) 3555-9000"
    });
    this.createClient({
      name: "Hospital S\xE3o Lucas",
      email: "atendimento@saolucas.com.br",
      phone: "(11) 3777-8520"
    });
    this.createClient({
      name: "Cl\xEDnica M\xE9dica Bem Estar",
      email: "clinica@bemestar.com.br",
      phone: "(11) 2222-3333"
    });
    const users2 = Array.from(this.users.values());
    if (users2.length > 0) {
      const existingUser = users2[0];
      existingUser.role = "EMPLOYEE";
      this.users.set(existingUser.id, existingUser);
    }
  }
  // User operations
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserByUsername(username) {
    return Array.from(this.users.values()).find(
      (user) => user.email === username
    );
  }
  async createUser(insertUser) {
    const id = this.userCurrentId++;
    const user = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  async getUsers() {
    return Array.from(this.users.values());
  }
  async getEmployees() {
    return Array.from(this.users.values()).filter(
      (user) => user.role === "EMPLOYEE"
    );
  }
  async deleteUser(id) {
    this.users.delete(id);
  }
  // Client operations
  async getClient(id) {
    return this.clients.get(id);
  }
  async getClients() {
    return Array.from(this.clients.values());
  }
  async deleteClient(id) {
    this.clients.delete(id);
  }
  async createClient(client) {
    const id = this.clientCurrentId++;
    const newClient = { ...client, id };
    this.clients.set(id, newClient);
    return newClient;
  }
  // Equipment operations
  async getEquipment(id) {
    return this.equipments.get(id);
  }
  async getEquipments() {
    return Array.from(this.equipments.values());
  }
  async getEquipmentsByStatus(status) {
    return Array.from(this.equipments.values()).filter(
      (equipment) => equipment.status === status
    );
  }
  async createEquipment(equipment) {
    const id = this.equipmentCurrentId++;
    const now = /* @__PURE__ */ new Date();
    const newEquipment = {
      ...equipment,
      id,
      receivedAt: now.toISOString(),
      cleaningStartedAt: null,
      cleaningFinishedAt: null,
      returnedAt: null,
      returnedBy: null
    };
    this.equipments.set(id, newEquipment);
    const steps = ["Recebimento", "Triagem Inicial", "Limpeza B\xE1sica", "Limpeza Profunda", "Esteriliza\xE7\xE3o", "Inspe\xE7\xE3o Final"];
    for (const step of steps) {
      await this.createCleaningStep({
        equipmentId: id,
        step,
        completed: false
      });
    }
    return newEquipment;
  }
  async updateEquipmentStatus(id, status) {
    const equipment = await this.getEquipment(id);
    if (!equipment) {
      throw new Error("Equipment not found");
    }
    const now = /* @__PURE__ */ new Date();
    let updatedEquipment = { ...equipment };
    if (status === "CLEANING" && equipment.status !== "CLEANING") {
      updatedEquipment.cleaningStartedAt = now.toISOString();
    } else if (status === "FINISHED" && equipment.status !== "FINISHED") {
      updatedEquipment.cleaningFinishedAt = now.toISOString();
    }
    updatedEquipment.status = status;
    this.equipments.set(id, updatedEquipment);
    return updatedEquipment;
  }
  async returnEquipment(id, returnedBy, comments) {
    const equipment = await this.getEquipment(id);
    if (!equipment) {
      throw new Error("Equipment not found");
    }
    const now = /* @__PURE__ */ new Date();
    const updatedEquipment = {
      ...equipment,
      status: "RETURNED",
      returnedAt: now.toISOString(),
      returnedBy
    };
    this.equipments.set(id, updatedEquipment);
    return updatedEquipment;
  }
  async getNextEquipmentId() {
    return this.equipmentCurrentId;
  }
  // Cleaning steps operations
  async getCleaningSteps(equipmentId) {
    return Array.from(this.cleaningSteps.values()).filter(
      (step) => step.equipmentId === equipmentId
    );
  }
  async createCleaningStep(step) {
    const id = this.cleaningStepCurrentId++;
    const newStep = {
      ...step,
      id,
      completedAt: null
    };
    this.cleaningSteps.set(id, newStep);
    return newStep;
  }
  async updateCleaningStep(id, completed) {
    const step = this.cleaningSteps.get(id);
    if (!step) {
      throw new Error("Cleaning step not found");
    }
    const now = /* @__PURE__ */ new Date();
    const updatedStep = {
      ...step,
      completed,
      completedAt: completed ? now.toISOString() : null
    };
    this.cleaningSteps.set(id, updatedStep);
    if (completed) {
      const steps = await this.getCleaningSteps(step.equipmentId);
      const allCompleted = steps.every((s) => s.completed || s.id === id);
      if (allCompleted) {
        await this.updateEquipmentStatus(step.equipmentId, "FINISHED");
      } else if (step.step === "Recebimento") {
        await this.updateEquipmentStatus(step.equipmentId, "CLEANING");
      }
    }
    return updatedStep;
  }
};
var storage = new MemStorage();

// server/auth.ts
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session2 from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
var scryptAsync = promisify(scrypt);
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}
async function comparePasswords(supplied, stored) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = await scryptAsync(supplied, salt, 64);
  return timingSafeEqual(hashedBuf, suppliedBuf);
}
function setupAuth(app2) {
  const sessionSettings = {
    secret: "chave_secreta_temporaria",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore
  };
  app2.set("trust proxy", 1);
  app2.use(session2(sessionSettings));
  app2.use(passport.initialize());
  app2.use(passport.session());
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      const user = await storage.getUserByUsername(username);
      if (!user || !await comparePasswords(password, user.password)) {
        return done(null, false);
      } else {
        return done(null, user);
      }
    })
  );
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });
  app2.post("/api/register", async (req, res, next) => {
    const existingUser = await storage.getUserByUsername(req.body.username);
    if (existingUser) {
      return res.status(400).send("Username already exists");
    }
    const user = await storage.createUser({
      ...req.body,
      password: await hashPassword(req.body.password)
    });
    req.login(user, (err) => {
      if (err) return next(err);
      res.status(201).json(user);
    });
  });
  app2.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });
  app2.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });
  app2.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}

// shared/schema.ts
import { pgTable, text, serial, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var userRoleEnum = pgEnum("user_role", ["CLIENT", "EMPLOYEE", "MANAGER"]);
var equipmentStatusEnum = pgEnum("equipment_status", ["PENDING", "CLEANING", "FINISHED", "RETURNED"]);
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: userRoleEnum("role").notNull().default("CLIENT")
});
var insertUserSchema = createInsertSchema(users).pick({
  name: true,
  email: true,
  password: true,
  role: true
});
var clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull()
});
var insertClientSchema = createInsertSchema(clients);
var equipments = pgTable("equipments", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  description: text("description").notNull(),
  type: text("type").notNull(),
  quantity: integer("quantity").notNull().default(1),
  clientId: integer("client_id").notNull(),
  receivedBy: integer("received_by").notNull(),
  receivedAt: timestamp("received_at").notNull().defaultNow(),
  status: equipmentStatusEnum("status").notNull().default("PENDING"),
  cleaningStartedAt: timestamp("cleaning_started_at"),
  cleaningFinishedAt: timestamp("cleaning_finished_at"),
  returnedAt: timestamp("returned_at"),
  returnedBy: integer("returned_by")
});
var insertEquipmentSchema = createInsertSchema(equipments).omit({
  id: true,
  code: true,
  receivedAt: true,
  cleaningStartedAt: true,
  cleaningFinishedAt: true,
  returnedAt: true,
  status: true
});
var cleaningSteps = pgTable("cleaning_steps", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id").notNull(),
  step: text("step").notNull(),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at")
});
var insertCleaningStepSchema = createInsertSchema(cleaningSteps).omit({
  id: true,
  completedAt: true
});

// client/src/lib/utils.ts
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
function generateEquipmentCode(num) {
  return `EQ-${String(num).padStart(4, "0")}`;
}

// server/routes.ts
function registerRoutes(app2) {
  setupAuth(app2);
  app2.get("/api/clients", async (req, res) => {
    try {
      const clients2 = await storage.getClients();
      res.json(clients2);
    } catch (error) {
      res.status(500).json({ message: "Error fetching clients" });
    }
  });
  app2.post("/api/clients", async (req, res) => {
    try {
      const client = await storage.createClient(req.body);
      res.status(201).json(client);
    } catch (error) {
      res.status(500).json({ message: "Error creating client" });
    }
  });
  app2.delete("/api/clients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteClient(id);
      res.status(200).json({ message: "Client deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting client" });
    }
  });
  app2.get("/api/employees", async (req, res) => {
    try {
      const employees = await storage.getEmployees();
      res.json(employees);
    } catch (error) {
      res.status(500).json({ message: "Error fetching employees" });
    }
  });
  app2.get("/api/users", async (req, res) => {
    try {
      const users2 = await storage.getUsers();
      res.json(users2);
    } catch (error) {
      res.status(500).json({ message: "Error fetching users" });
    }
  });
  app2.delete("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteUser(id);
      res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting user" });
    }
  });
  app2.get("/api/equipments", async (req, res) => {
    try {
      const equipments2 = await storage.getEquipments();
      res.json(equipments2);
    } catch (error) {
      res.status(500).json({ message: "Error fetching equipments" });
    }
  });
  app2.get("/api/equipments/finished", async (req, res) => {
    try {
      const equipments2 = await storage.getEquipmentsByStatus("FINISHED");
      res.json(equipments2);
    } catch (error) {
      res.status(500).json({ message: "Error fetching finished equipments" });
    }
  });
  app2.post("/api/equipments", async (req, res) => {
    try {
      const parsedData = insertEquipmentSchema.parse(req.body);
      const nextId = await storage.getNextEquipmentId();
      const code = generateEquipmentCode(nextId);
      const equipment = await storage.createEquipment({
        ...parsedData,
        code
      });
      res.status(201).json(equipment);
    } catch (error) {
      res.status(500).json({ message: "Error creating equipment" });
    }
  });
  app2.post("/api/equipments/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!Object.values(equipmentStatusEnum.enumValues).includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      const equipment = await storage.updateEquipmentStatus(parseInt(id), status);
      res.json(equipment);
    } catch (error) {
      res.status(500).json({ message: "Error updating equipment status" });
    }
  });
  app2.post("/api/equipments/return", async (req, res) => {
    try {
      const { equipmentId, returnedBy, comments } = req.body;
      const equipment = await storage.returnEquipment(
        parseInt(equipmentId),
        parseInt(returnedBy),
        comments
      );
      res.json(equipment);
    } catch (error) {
      res.status(500).json({ message: "Error returning equipment" });
    }
  });
  app2.get("/api/equipments/:id/cleaning-steps", async (req, res) => {
    try {
      const { id } = req.params;
      const cleaningSteps2 = await storage.getCleaningSteps(parseInt(id));
      res.json(cleaningSteps2);
    } catch (error) {
      res.status(500).json({ message: "Error fetching cleaning steps" });
    }
  });
  app2.put("/api/cleaning-steps/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { completed } = req.body;
      const cleaningStep = await storage.updateCleaningStep(parseInt(id), completed);
      res.json(cleaningStep);
    } catch (error) {
      res.status(500).json({ message: "Error updating cleaning step" });
    }
  });
  return app2;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themePlugin(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: ["localhost"]
    // <-- CORRIGIDO AQUI
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "..", "dist", "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
import { createServer } from "http";
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use(session3({
  secret: "chave_secreta_temporaria",
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1e3 * 60 * 60 * 24
    // 1 dia
  }
}));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
app.use((err, _req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});
registerRoutes(app);
if (process.env.NODE_ENV === "development") {
  const httpServer = createServer(app);
  setupVite(app, httpServer);
} else {
  serveStatic(app);
}
var index_default = app;
export {
  index_default as default
};
