import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { basicAuth } from "hono/basic-auth";

import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import { leadStore } from "./trpc/store/leadStore";
import { isSupabaseConfigured, getSupabase } from "./supabase/client";
import type { IntakeStatus } from "@/types/intake";

const app = new Hono();

app.use("*", cors());

app.use(
  "/api/trpc/*",
  trpcServer({
    endpoint: "/api/trpc",
    router: appRouter,
    createContext,
  }),
);

app.get("/", (c) => {
  return c.json({ 
    status: "ok", 
    message: "Saver.Insurance API is running",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    endpoints: {
      trpc: "/api/trpc",
      health: "/health",
      docs: "/docs",
    },
  });
});

app.get("/health", async (c) => {
  const supabaseOk = isSupabaseConfigured();
  let supabaseReachable = false;

  if (supabaseOk) {
    try {
      const { error } = await getSupabase().from('leads').select('id').limit(1);
      supabaseReachable = !error;
    } catch {
      supabaseReachable = false;
    }
  }

  const healthy = supabaseOk && supabaseReachable;

  return c.json({
    status: healthy ? "healthy" : "degraded",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
    uptime: process.uptime ? process.uptime() : 0,
    environment: process.env.NODE_ENV || "production",
    checks: {
      supabaseConfigured: supabaseOk,
      supabaseReachable,
      adminTokenSet: !!process.env.ADMIN_TOKEN,
    },
  }, healthy ? 200 : 503);
});

app.get("/docs", (c) => {
  return c.json({
    title: "Saver.Insurance API",
    version: "2.0.0",
    description: "Backend API for SAVER OS - Supabase-backed P&C Insurance Platform",
    routes: {
      intake: "Lead intake (submit, getMissingFields, submitField)",
      assistant: "AI assistant (submitIntake, getTurn, answer, getLead)",
      quotesReal: "Quote lifecycle (requestQuote, list, ingest, fail, reset)",
      adminOps: "Admin operations (listLeads, getLead, searchLeads, stats, quoteRequests)",
      followups: "Follow-up tasks (list, create, complete, escalate, overdue)",
      commitments: "Customer commitments (list, create, honor)",
      communications: "Communication log (list, log)",
      events: "Lead event timeline (list)",
      retention: "Policy vault + payment/renewal reminders",
      referralsEngine: "Referral tracking (create, listByReferrer, updateStatus, getStats)",
      evidence: "Evidence packages (create, get, updateChecklist, listByLead)",
      funnel: "Ops metrics & funnel (getMetrics, getNoCloseReasons)",
      agentApplications: "Agent applications (submit)",
    },
    healthCheck: "GET /health",
    adminCsvExport: "GET /api/admin/export/leads.csv",
    adminStats: "GET /api/admin/stats",
  });
});

const adminUser = process.env.ADMIN_BASIC_USER || "admin";
const adminPass = process.env.ADMIN_BASIC_PASS || process.env.ADMIN_TOKEN || "saver-admin-2024";

app.use(
  "/api/admin/*",
  basicAuth({
    username: adminUser,
    password: adminPass,
    realm: "Saver Admin",
  })
);

app.get("/api/admin/export/leads.csv", async (c) => {
  const statusParam = c.req.query("status");
  let status: IntakeStatus | undefined;
  
  if (statusParam === "WAITING_DOCS" || statusParam === "NEEDS_INFO" || statusParam === "READY_TO_QUOTE") {
    status = statusParam;
  }
  
  const csv = await leadStore.exportCsv({ status });
  const filename = `leads_${status || "all"}_${new Date().toISOString().split("T")[0]}.csv`;
  
  console.log(`[ADMIN] CSV export: ${csv.split("\n").length - 1} leads, status=${status || "all"}`);
  
  c.header("Content-Type", "text/csv; charset=utf-8");
  c.header("Content-Disposition", `attachment; filename="${filename}"`);
  
  return c.body(csv);
});

app.get("/api/admin/stats", async (c) => {
  const leadStats = await leadStore.getStats();
  return c.json({
    leads: leadStats,
    timestamp: new Date().toISOString(),
  });
});

export default app;
