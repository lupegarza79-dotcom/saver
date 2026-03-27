#!/usr/bin/env bash
set -euo pipefail

# ============================================
# SAVER OS — Pilot E2E Test Script (bash)
# ============================================
# Reads from env vars:
#   BASE_URL    — backend base URL (e.g. https://your-app.rork.app)
#   ADMIN_TOKEN — admin token for adminProcedure calls
# ============================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS_COUNT=0
FAIL_COUNT=0
LEAD_ID=""
QUOTE_REQUEST_ID=""

if [ -z "${BASE_URL:-}" ]; then
  echo -e "${RED}ERROR: BASE_URL not set. Export it first: export BASE_URL=https://your-backend-url${NC}"
  exit 1
fi
if [ -z "${ADMIN_TOKEN:-}" ]; then
  echo -e "${RED}ERROR: ADMIN_TOKEN not set. Export it first: export ADMIN_TOKEN=your-token${NC}"
  exit 1
fi

BASE_URL="${BASE_URL%/}"
TRPC="$BASE_URL/api/trpc"
TOMORROW=$(date -u -d "+1 day" '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || date -u -v+1d '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || echo "2026-02-26T12:00:00Z")

log_pass() {
  PASS_COUNT=$((PASS_COUNT + 1))
  echo -e "${GREEN}  PASS: $1${NC}"
}

log_fail() {
  FAIL_COUNT=$((FAIL_COUNT + 1))
  echo -e "${RED}  FAIL: $1${NC}"
  echo -e "${YELLOW}    Endpoint: $2${NC}"
  echo -e "${YELLOW}    Payload:  $3${NC}"
  echo -e "${YELLOW}    Response: $4${NC}"
  echo -e "${YELLOW}    Fix:      $5${NC}"
}

trpc_mutate() {
  local proc="$1"
  local payload="$2"
  local use_admin="${3:-false}"
  if [ "$use_admin" = "true" ]; then
    curl -s -X POST "$TRPC/$proc" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -d "$payload"
  else
    curl -s -X POST "$TRPC/$proc" \
      -H "Content-Type: application/json" \
      -d "$payload"
  fi
}

trpc_query() {
  local proc="$1"
  local input="$2"
  local use_admin="${3:-false}"
  local encoded
  encoded=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$input" 2>/dev/null || echo "$input")
  if [ "$use_admin" = "true" ]; then
    curl -s "$TRPC/$proc?input=$encoded" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $ADMIN_TOKEN"
  else
    curl -s "$TRPC/$proc?input=$encoded" \
      -H "Content-Type: application/json"
  fi
}

extract_json() {
  python3 -c "import sys,json; d=json.load(sys.stdin); exec(sys.argv[1])" "$1" 2>/dev/null
}

echo ""
echo "============================================"
echo " SAVER OS — Pilot E2E Test"
echo " BASE_URL: $BASE_URL"
echo " Time:     $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo "============================================"
echo ""

# --------------------------------------------------
# Step 1: GET /health
# --------------------------------------------------
echo "Step 1: Health Check"
RESP=$(curl -s "$BASE_URL/health")
STATUS=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null || echo "")

if [ "$STATUS" = "healthy" ]; then
  log_pass "Health check returned 'healthy'"
else
  log_fail "Health check failed (status=$STATUS)" \
    "GET $BASE_URL/health" \
    "N/A" \
    "$RESP" \
    "Check SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_TOKEN env vars. See docs/PRODUCTION_CLOSE_EXECUTION.md section F."
fi

# --------------------------------------------------
# Step 2: intake.submit
# --------------------------------------------------
echo ""
echo "Step 2: Submit Lead (intake.submit)"
INTAKE_PAYLOAD='{"userId":"pilot_test_user","intake":{"insuredFullName":"Carlos Pilot","phone":"5125550101","garagingAddress":{"zip":"78701","state":"TX"},"contactPreference":"whatsapp","language":"en","drivers":[{"fullName":"Carlos Pilot","dob":"1990-01-15"}],"vehicles":[{"vin":"1HGCM82633A004352","year":2020,"make":"Honda","model":"Civic"}],"coverageType":"full","liabilityLimits":"30/60/25","consentContactAllowed":true,"priceGate":{"notifyOnlyIfCheaper":true,"targetSavings":10}}}'

RESP=$(trpc_mutate "intake.submit" "$INTAKE_PAYLOAD")
LEAD_ID=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('result',{}).get('data',{}).get('leadId',''))" 2>/dev/null || echo "")
READY=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('result',{}).get('data',{}).get('ready',''))" 2>/dev/null || echo "")

if [ -n "$LEAD_ID" ] && [ "$LEAD_ID" != "None" ] && [ "$LEAD_ID" != "" ]; then
  log_pass "Lead created: $LEAD_ID (ready=$READY)"
else
  log_fail "intake.submit failed" \
    "POST $TRPC/intake.submit" \
    "(see script source)" \
    "$RESP" \
    "Check backend/trpc/routes/intake.ts, backend/trpc/store/leadStore.ts, and Supabase connectivity."
fi

# --------------------------------------------------
# Step 3: quotesReal.requestQuote
# --------------------------------------------------
echo ""
echo "Step 3: Request Quote (quotesReal.requestQuote)"
if [ -n "$LEAD_ID" ] && [ "$LEAD_ID" != "None" ] && [ "$LEAD_ID" != "" ]; then
  QR_PAYLOAD="{\"leadId\":\"$LEAD_ID\",\"requestedBy\":\"pilot_test\"}"
  RESP=$(trpc_mutate "quotesReal.requestQuote" "$QR_PAYLOAD")
  QUOTE_REQUEST_ID=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('result',{}).get('data',{}).get('quoteRequestId',''))" 2>/dev/null || echo "")

  if [ -n "$QUOTE_REQUEST_ID" ] && [ "$QUOTE_REQUEST_ID" != "None" ] && [ "$QUOTE_REQUEST_ID" != "" ]; then
    log_pass "QuoteRequest created: $QUOTE_REQUEST_ID"
  else
    log_fail "quotesReal.requestQuote failed" \
      "POST $TRPC/quotesReal.requestQuote" \
      "$QR_PAYLOAD" \
      "$RESP" \
      "Ensure lead status is READY_TO_QUOTE. Check backend/trpc/routes/quotesReal.ts line 35."
  fi
else
  log_fail "Skipped (no LEAD_ID from step 2)" "N/A" "N/A" "N/A" "Fix step 2 first."
fi

# --------------------------------------------------
# Step 4: quotesReal.ingest
# --------------------------------------------------
echo ""
echo "Step 4: Ingest Quote (quotesReal.ingest)"
if [ -n "$QUOTE_REQUEST_ID" ] && [ "$QUOTE_REQUEST_ID" != "None" ] && [ "$QUOTE_REQUEST_ID" != "" ]; then
  INGEST_PAYLOAD="{\"quoteRequestId\":\"$QUOTE_REQUEST_ID\",\"quotes\":[{\"provider\":\"TestCarrier\",\"premiumCents\":15000,\"source\":\"AGENT\",\"productName\":\"Auto Full\",\"termMonths\":6}]}"
  RESP=$(trpc_mutate "quotesReal.ingest" "$INGEST_PAYLOAD")
  OK=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('result',{}).get('data',{}).get('ok',''))" 2>/dev/null || echo "")

  if [ "$OK" = "True" ]; then
    log_pass "Quote ingested successfully"
  else
    log_fail "quotesReal.ingest failed" \
      "POST $TRPC/quotesReal.ingest" \
      "$INGEST_PAYLOAD" \
      "$RESP" \
      "Check backend/trpc/routes/quotesReal.ts, backend/trpc/store/quoteStore.ts."
  fi
else
  log_fail "Skipped (no QUOTE_REQUEST_ID from step 3)" "N/A" "N/A" "N/A" "Fix step 3 first."
fi

# --------------------------------------------------
# Step 5: followups.create (admin)
# --------------------------------------------------
echo ""
echo "Step 5: Create Follow-up (followups.create)"
if [ -n "$LEAD_ID" ] && [ "$LEAD_ID" != "None" ] && [ "$LEAD_ID" != "" ]; then
  FU_PAYLOAD="{\"leadId\":\"$LEAD_ID\",\"type\":\"scheduled\",\"dueAt\":\"$TOMORROW\",\"assignedToRole\":\"IAT_1\",\"priority\":\"normal\",\"reason\":\"Pilot test follow-up\"}"
  RESP=$(trpc_mutate "followups.create" "$FU_PAYLOAD" "true")
  OK=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('result',{}).get('data',{}).get('ok',''))" 2>/dev/null || echo "")

  if [ "$OK" = "True" ]; then
    log_pass "Follow-up created"
  else
    log_fail "followups.create failed" \
      "POST $TRPC/followups.create" \
      "$FU_PAYLOAD" \
      "$RESP" \
      "Check admin auth (Authorization: Bearer TOKEN). Check schema-v2 + v3 ran. See backend/trpc/routes/followups.ts."
  fi
else
  log_fail "Skipped (no LEAD_ID)" "N/A" "N/A" "N/A" "Fix step 2 first."
fi

# --------------------------------------------------
# Step 6: commitments.create (admin)
# --------------------------------------------------
echo ""
echo "Step 6: Create Commitment (commitments.create)"
if [ -n "$LEAD_ID" ] && [ "$LEAD_ID" != "None" ] && [ "$LEAD_ID" != "" ]; then
  CMT_PAYLOAD="{\"leadId\":\"$LEAD_ID\",\"type\":\"callback\",\"promisedAt\":\"$TOMORROW\",\"channel\":\"whatsapp\",\"description\":\"Pilot callback test\",\"createdByRole\":\"IAT_1\"}"
  RESP=$(trpc_mutate "commitments.create" "$CMT_PAYLOAD" "true")
  OK=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('result',{}).get('data',{}).get('ok',''))" 2>/dev/null || echo "")

  if [ "$OK" = "True" ]; then
    log_pass "Commitment created"
  else
    log_fail "commitments.create failed" \
      "POST $TRPC/commitments.create" \
      "$CMT_PAYLOAD" \
      "$RESP" \
      "Check admin auth. Check schema-v2 + v3. See backend/trpc/routes/followups.ts (commitmentsRouter)."
  fi
else
  log_fail "Skipped (no LEAD_ID)" "N/A" "N/A" "N/A" "Fix step 2 first."
fi

# --------------------------------------------------
# Step 7: communications.log (admin)
# --------------------------------------------------
echo ""
echo "Step 7: Log Communication (communications.log)"
if [ -n "$LEAD_ID" ] && [ "$LEAD_ID" != "None" ] && [ "$LEAD_ID" != "" ]; then
  COMM_PAYLOAD="{\"leadId\":\"$LEAD_ID\",\"channel\":\"whatsapp\",\"direction\":\"outbound\",\"messageType\":\"initial_contact\",\"content\":\"Pilot test message\",\"sentByRole\":\"IAT_1\"}"
  RESP=$(trpc_mutate "communications.log" "$COMM_PAYLOAD" "true")
  OK=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('result',{}).get('data',{}).get('ok',''))" 2>/dev/null || echo "")

  if [ "$OK" = "True" ]; then
    log_pass "Communication logged"
  else
    log_fail "communications.log failed" \
      "POST $TRPC/communications.log" \
      "$COMM_PAYLOAD" \
      "$RESP" \
      "Check admin auth. Check schema-v2 + v3 for lead_communications. See backend/trpc/routes/followups.ts."
  fi
else
  log_fail "Skipped (no LEAD_ID)" "N/A" "N/A" "N/A" "Fix step 2 first."
fi

# --------------------------------------------------
# Step 8: referralsEngine.create (public)
# --------------------------------------------------
echo ""
echo "Step 8: Create Referral (referralsEngine.create)"
REF_PAYLOAD='{"referrerPhone":"5125550101","referredName":"Maria Pilot","referredPhone":"5125550102","source":"direct_form","language":"es"}'
RESP=$(trpc_mutate "referralsEngine.create" "$REF_PAYLOAD")
OK=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('result',{}).get('data',{}).get('ok',''))" 2>/dev/null || echo "")

if [ "$OK" = "True" ]; then
  log_pass "Referral created"
else
  log_fail "referralsEngine.create failed" \
    "POST $TRPC/referralsEngine.create" \
    "$REF_PAYLOAD" \
    "$RESP" \
    "Check schema-v2 for referrals table. See backend/trpc/routes/referralsEngine.ts."
fi

# --------------------------------------------------
# Step 9: funnel.getMetrics (public)
# --------------------------------------------------
echo ""
echo "Step 9: Pull Funnel Metrics (funnel.getMetrics)"
RESP=$(trpc_query "funnel.getMetrics" '{}')
TOTAL=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('result',{}).get('data',{}).get('funnel',{}).get('totalLeads',0))" 2>/dev/null || echo "0")

if [ "$TOTAL" -gt 0 ] 2>/dev/null; then
  log_pass "Funnel metrics returned (totalLeads=$TOTAL)"
else
  log_fail "funnel.getMetrics returned 0 leads or failed" \
    "GET $TRPC/funnel.getMetrics?input={}" \
    "{}" \
    "$RESP" \
    "Check Supabase connectivity. Check schema-v2 tables. See backend/trpc/routes/referralsEngine.ts (funnelRouter)."
fi

# --------------------------------------------------
# Step 10: events.list (admin)
# --------------------------------------------------
echo ""
echo "Step 10: Pull Lead Events (events.list)"
if [ -n "$LEAD_ID" ] && [ "$LEAD_ID" != "None" ] && [ "$LEAD_ID" != "" ]; then
  EVENTS_INPUT="{\"leadId\":\"$LEAD_ID\"}"
  RESP=$(trpc_query "events.list" "$EVENTS_INPUT" "true")
  TOTAL_EVENTS=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('result',{}).get('data',{}).get('total',0))" 2>/dev/null || echo "0")

  if [ "$TOTAL_EVENTS" -gt 0 ] 2>/dev/null; then
    log_pass "Events timeline returned ($TOTAL_EVENTS events)"
  else
    log_fail "events.list returned 0 events" \
      "GET $TRPC/events.list" \
      "$EVENTS_INPUT" \
      "$RESP" \
      "Check schema-v2 + v3 for lead_events. Check backend/trpc/utils/logEvent.ts. Check admin auth header."
  fi
else
  log_fail "Skipped (no LEAD_ID)" "N/A" "N/A" "N/A" "Fix step 2 first."
fi

# --------------------------------------------------
# SUMMARY
# --------------------------------------------------
echo ""
echo "============================================"
echo " RESULTS"
echo "============================================"
echo -e " ${GREEN}PASS: $PASS_COUNT${NC}"
echo -e " ${RED}FAIL: $FAIL_COUNT${NC}"
echo ""

if [ "$FAIL_COUNT" -eq 0 ]; then
  echo -e "${GREEN}ALL STEPS PASSED — Pilot E2E complete.${NC}"
  exit 0
else
  echo -e "${RED}$FAIL_COUNT step(s) failed. Review output above.${NC}"
  exit 1
fi
