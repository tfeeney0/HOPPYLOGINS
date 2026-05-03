import "server-only";

const MAILGUN_ROUTES_ENDPOINT = "https://api.mailgun.net/v3/routes";

type JsonRecord = Record<string, unknown>;

export interface MailgunRoute {
  id: string;
  priority?: number;
  description?: string;
  expression?: string;
  actions?: string[];
  created_at?: string;
}

export interface MailgunRouteResponse {
  message: string;
  route?: MailgunRoute;
}

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null;
}

function readRequiredEnv(name: "MAILGUN_API_KEY" | "MAILGUN_DOMAIN" | "NEXT_PUBLIC_APP_URL"): string {
  const value = process.env[name];

  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value.trim();
}

function getMailgunAuthHeader(): string {
  const apiKey = readRequiredEnv("MAILGUN_API_KEY");
  const encoded = btoa(`api:${apiKey}`);
  return `Basic ${encoded}`;
}

function toMailgunRouteResponse(payload: unknown): MailgunRouteResponse {
  if (!isJsonRecord(payload)) {
    return { message: "Mailgun returned a non-object response." };
  }

  const message = typeof payload.message === "string"
    ? payload.message
    : "Mailgun responded without a message.";

  const routeRaw = payload.route;
  if (!isJsonRecord(routeRaw) || typeof routeRaw.id !== "string") {
    return { message };
  }

  const route: MailgunRoute = {
    id: routeRaw.id
  };

  if (typeof routeRaw.priority === "number") {
    route.priority = routeRaw.priority;
  }
  if (typeof routeRaw.description === "string") {
    route.description = routeRaw.description;
  }
  if (typeof routeRaw.expression === "string") {
    route.expression = routeRaw.expression;
  }
  if (Array.isArray(routeRaw.actions) && routeRaw.actions.every((item) => typeof item === "string")) {
    route.actions = routeRaw.actions;
  }
  if (typeof routeRaw.created_at === "string") {
    route.created_at = routeRaw.created_at;
  }

  return {
    message,
    route
  };
}

async function readResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  const textBody = await response.text();
  if (!textBody) {
    return null;
  }

  try {
    return JSON.parse(textBody) as unknown;
  } catch {
    return { message: textBody };
  }
}

function getSafeErrorMessage(payload: unknown): string {
  if (!isJsonRecord(payload)) {
    return "Mailgun request failed.";
  }

  const message = payload.message;
  return typeof message === "string" && message.trim()
    ? message
    : "Mailgun request failed.";
}

async function requestMailgun(
  input: RequestInfo | URL,
  init: RequestInit
): Promise<MailgunRouteResponse> {
  const response = await fetch(input, {
    ...init,
    cache: "no-store"
  });
  const payload = await readResponseBody(response);

  if (!response.ok) {
    const safeMessage = getSafeErrorMessage(payload);
    throw new Error(`Mailgun API error (${response.status}): ${safeMessage}`);
  }

  return toMailgunRouteResponse(payload);
}

function normalizeAppUrl(rawAppUrl: string): string {
  return rawAppUrl.endsWith("/") ? rawAppUrl.slice(0, -1) : rawAppUrl;
}

export async function createDynamicRoute(prefix: string): Promise<MailgunRouteResponse> {
  const normalizedPrefix = prefix.trim();
  if (!normalizedPrefix) {
    throw new Error("Prefix is required to create a Mailgun route.");
  }

  const mailgunDomain = readRequiredEnv("MAILGUN_DOMAIN");
  const appUrl = normalizeAppUrl(readRequiredEnv("NEXT_PUBLIC_APP_URL"));

  const expression = `match_recipient("${normalizedPrefix}@${mailgunDomain}")`;
  const forwardAction = `forward("${appUrl}/api/inbound")`;

  const body = new URLSearchParams();
  body.set("priority", "0");
  body.set("description", `Dynamic route for ${normalizedPrefix}@${mailgunDomain}`);
  body.set("expression", expression);
  body.append("action", forwardAction);
  body.append("action", "stop()");

  return requestMailgun(MAILGUN_ROUTES_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: getMailgunAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: body.toString()
  });
}

export async function deleteDynamicRoute(routeId: string): Promise<MailgunRouteResponse> {
  const normalizedRouteId = routeId.trim();
  if (!normalizedRouteId) {
    throw new Error("Route ID is required to delete a Mailgun route.");
  }

  const encodedRouteId = encodeURIComponent(normalizedRouteId);

  return requestMailgun(`${MAILGUN_ROUTES_ENDPOINT}/${encodedRouteId}`, {
    method: "DELETE",
    headers: {
      Authorization: getMailgunAuthHeader()
    }
  });
}
