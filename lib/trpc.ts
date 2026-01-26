import { httpLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import superjson from "superjson";
import type { AppRouter } from "@/backend/trpc/app-router";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  // WEB (Rork preview / web deploy): always use same origin
  if (typeof window !== "undefined" && window?.location?.origin) {
    return window.location.origin;
  }

  // NATIVE (if you later use Expo on device): must be set
  const url = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  if (!url) {
    console.warn("[TRPC] Missing EXPO_PUBLIC_RORK_API_BASE_URL for native runtime");
    return "";
  }
  return url.replace(/\/$/, ""); // remove trailing slash
};

export const trpcClient = trpc.createClient({
  transformer: superjson,
  links: [
    httpLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
      headers: () => ({}),
    }),
  ],
});
