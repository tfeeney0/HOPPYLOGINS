import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_SIGNATURE_AGE_SECONDS = 5 * 60;

type MailgunSignaturePayload = {
  timestamp: string;
  token: string;
  signature: string;
};

type InboundEmailPayload = {
  sender: string;
  recipient: string;
  subject: string;
  bodyPlain: string;
};

class HttpError extends Error {
  public readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function readRequiredTextField(formData: FormData, field: string): string {
  const value = formData.get(field);

  if (typeof value !== "string") {
    throw new HttpError(400, `Missing or invalid field: ${field}`);
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    throw new HttpError(400, `Field cannot be empty: ${field}`);
  }

  return trimmedValue;
}

function readOptionalTextField(formData: FormData, field: string): string {
  const value = formData.get(field);
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value);
}

function parseMailgunSignature(formData: FormData): MailgunSignaturePayload {
  return {
    timestamp: readRequiredTextField(formData, "timestamp"),
    token: readRequiredTextField(formData, "token"),
    signature: readRequiredTextField(formData, "signature")
  };
}

function parseInboundPayload(formData: FormData): InboundEmailPayload {
  const sender = readRequiredTextField(formData, "sender");
  const recipient = readRequiredTextField(formData, "recipient");
  const subject = readOptionalTextField(formData, "subject");
  const bodyPlain = readOptionalTextField(formData, "body-plain");

  if (!isValidEmail(recipient)) {
    throw new HttpError(400, "Invalid recipient email format.");
  }

  return {
    sender,
    recipient,
    subject,
    bodyPlain
  };
}

function isTimestampFresh(timestamp: string): boolean {
  const parsedTimestamp = Number(timestamp);

  if (!Number.isFinite(parsedTimestamp)) {
    return false;
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);
  return Math.abs(nowInSeconds - parsedTimestamp) <= MAX_SIGNATURE_AGE_SECONDS;
}

function isValidMailgunSignature(
  payload: MailgunSignaturePayload,
  signingKey: string
): boolean {
  const digest = createHmac("sha256", signingKey)
    .update(`${payload.timestamp}${payload.token}`)
    .digest("hex");

  const received = payload.signature.toLowerCase();
  const expected = digest.toLowerCase();

  if (received.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const signingKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY;

    if (!supabaseUrl || !serviceRoleKey || !signingKey) {
      console.error("Missing required environment variables for inbound webhook.");
      return NextResponse.json(
        { ok: false, error: "Server configuration error." },
        { status: 500 }
      );
    }

    const formData = await request.formData();

    const signaturePayload = parseMailgunSignature(formData);
    if (!isTimestampFresh(signaturePayload.timestamp)) {
      return NextResponse.json(
        { ok: false, error: "Expired webhook token." },
        { status: 401 }
      );
    }

    if (!isValidMailgunSignature(signaturePayload, signingKey)) {
      return NextResponse.json(
        { ok: false, error: "Invalid webhook signature." },
        { status: 401 }
      );
    }

    const emailPayload = parseInboundPayload(formData);

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { error } = await supabase.from("emails").insert({
      sender: emailPayload.sender,
      recipient: emailPayload.recipient,
      subject: emailPayload.subject,
      body_plain: emailPayload.bodyPlain
    });

    if (error) {
      console.error("Failed to insert inbound email:", error.message);
      return NextResponse.json(
        { ok: false, error: "Could not persist inbound email." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status }
      );
    }

    console.error("Unhandled inbound webhook error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}
