import { createTRPCRouter } from "./create-context";
import { usersRouter } from "./routes/users";
import { policiesRouter, documentsRouter, remindersRouter, videoEvidenceRouter, accidentReportsRouter } from "./routes/policies";
import { adminRouter } from "./routes/admin";
import { snapshotsRouter, leadsRouter } from "./routes/snapshots";
import { agentsRouter, agentLeadsRouter, leadOffersRouter, agentApplicationsRouter } from "./routes/agents";
import { subscriptionsRouter } from "./routes/subscriptions";
import { intakeRouter } from "./routes/intake";
import { assistantRouter } from "./routes/assistant";
import { quotesRealRouter } from "./routes/quotesReal";
import { adminOpsRouter } from "./routes/adminOps";

export const appRouter = createTRPCRouter({
  users: usersRouter,
  policies: policiesRouter,
  documents: documentsRouter,
  reminders: remindersRouter,
  videoEvidence: videoEvidenceRouter,
  accidentReports: accidentReportsRouter,
  snapshots: snapshotsRouter,
  leads: leadsRouter,
  admin: adminRouter,
  agents: agentsRouter,
  agentLeads: agentLeadsRouter,
  leadOffers: leadOffersRouter,
  agentApplications: agentApplicationsRouter,
  subscriptions: subscriptionsRouter,
  intake: intakeRouter,
  assistant: assistantRouter,
  quotesReal: quotesRealRouter,
  adminOps: adminOpsRouter,
});

export type AppRouter = typeof appRouter;
