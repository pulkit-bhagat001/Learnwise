import { QueryClient } from "@tanstack/react-query";
import { getToken } from "./auth";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

export async function apiRequest(method: string, url: string, body?: any) {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let errorMsg = await res.text();
    try {
      const parsed = JSON.parse(errorMsg);
      errorMsg = parsed.message || parsed.error || errorMsg;
    } catch (e) {
      // Ignore
    }
    throw new Error(errorMsg);
  }

  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return null;
  }
  
  return res.json();
}

// Override custom fetch for orval generated client if needed
// This assumes orval is configured to use a custom mutator that we provide or it uses global fetch
// Since the prompt mentions custom-fetch throws on non-ok responses with error body,
// and it already exists in lib/api-client-react/src/custom-fetch.ts, we might need to modify that one or just set default headers globally.
// A common way for fetch to include tokens automatically is monkey-patching or standard wrappers.

const originalFetch = window.fetch;
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const token = getToken();
  
  if (token) {
    const newHeaders = new Headers(init?.headers);
    if (!newHeaders.has('Authorization')) {
      newHeaders.set('Authorization', `Bearer ${token}`);
    }
    init = {
      ...init,
      headers: newHeaders
    };
  }
  
  return originalFetch(input, init);
};
