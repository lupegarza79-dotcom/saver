import { createTRPCRouter } from "./create-context";
import { agentApplicationsRouter } from "./routes/agents";
import { intakeRouter } from "./routes/intake";
import { assistantRouter } from "./routes/assistant";
import { quotesRealRouter } from "./routes/quotesReal";
import { adminOpsRouter } from "./routes/adminOps";
import { followupsRouter, commitmentsRouter, communicationsRouter, eventsRouter } from "./routes/followups";
import { retentionRouter } from "./routes/retention";
import { referralsEngineRouter, evidenceRouter, funnelRouter } from "./routes/referralsEngine";

export const appRouter = createTRPCRouter({
  agentApplications: agentApplicationsRouter,
  intake: intakeRouter,
  assistant: assistantRouter,
  quotesReal: quotesRealRouter,
  adminOps: adminOpsRouter,
  followups: followupsRouter,
  commitments: commitmentsRouter,
  communications: communicationsRouter,
  events: eventsRouter,
  retention: retentionRouter,
  referralsEngine: referralsEngineRouter,
  evidence: evidenceRouter,
  funnel: funnelRouter,
});

export type AppRouter = typeof appRouter;
