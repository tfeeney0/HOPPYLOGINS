import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_SIGNATURE_AGE_SECONDS = 5 * 60;
const MAX_INLINE_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_RENDERED_IMAGES = 8;
const IMAGE_CONTENT_TYPE_PATTERN = /^image\/(?:png|jpe?g|gif|webp|bmp)$/i;
const IMAGE_EXTENSION_CONTENT_TYPES: Record<string, string> = {
  ".bmp": "image/bmp",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp"
};

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
  bodyHtml: string;
};

type InlineImage = {
  fieldName: string;
  fileName: string;
  contentType: string;
  dataUrl: string;
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

function readOptionalTextFields(formData: FormData, field: string): string[] {
  return formData
    .getAll(field)
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
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

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

function normalizeContentId(value: string): string {
  const trimmedValue = value.trim().replace(/^<|>$/g, "");

  try {
    return decodeURIComponent(trimmedValue).toLowerCase();
  } catch {
    return trimmedValue.toLowerCase();
  }
}

function parseContentIdMap(formData: FormData): Map<string, string> {
  const rawContentIdMap = readOptionalTextField(formData, "content-id-map");
  if (!rawContentIdMap) {
    return new Map();
  }

  try {
    const parsedContentIdMap: unknown = JSON.parse(rawContentIdMap);
    if (!parsedContentIdMap || typeof parsedContentIdMap !== "object") {
      return new Map();
    }

    return new Map(
      Object.entries(parsedContentIdMap)
        .filter((entry): entry is [string, string] => typeof entry[1] === "string")
        .map(([contentId, fieldName]) => [normalizeContentId(contentId), fieldName])
    );
  } catch {
    console.warn("Inbound email had an invalid content-id-map payload.");
    return new Map();
  }
}

function getImageContentType(file: File): string | null {
  if (IMAGE_CONTENT_TYPE_PATTERN.test(file.type)) {
    return file.type;
  }

  const fileName = file.name.toLowerCase();
  const matchingExtension = Object.keys(IMAGE_EXTENSION_CONTENT_TYPES).find((extension) =>
    fileName.endsWith(extension)
  );

  return matchingExtension ? IMAGE_EXTENSION_CONTENT_TYPES[matchingExtension] : null;
}

async function readInlineImages(formData: FormData): Promise<InlineImage[]> {
  const images: InlineImage[] = [];

  for (const [fieldName, value] of formData.entries()) {
    if (!(value instanceof File)) {
      continue;
    }

    const contentType = getImageContentType(value);
    if (!contentType || value.size > MAX_INLINE_IMAGE_BYTES) {
      continue;
    }

    const imageBuffer = Buffer.from(await value.arrayBuffer());
    images.push({
      fieldName,
      fileName: value.name || fieldName,
      contentType,
      dataUrl: `data:${contentType};base64,${imageBuffer.toString("base64")}`
    });

    if (images.length >= MAX_RENDERED_IMAGES) {
      break;
    }
  }

  return images;
}

function replaceCidImageReferences(
  bodyHtml: string,
  contentIdMap: Map<string, string>,
  inlineImages: InlineImage[]
): { html: string; referencedImageFields: Set<string> } {
  const imageByFieldName = new Map(inlineImages.map((image) => [image.fieldName, image]));
  const referencedImageFields = new Set<string>();

  const html = bodyHtml.replace(/cid:([^"'\s)>]+)/gi, (match, rawContentId: string) => {
    const fieldName = contentIdMap.get(normalizeContentId(rawContentId));
    const image = fieldName ? imageByFieldName.get(fieldName) : null;

    if (!image) {
      return match;
    }

    referencedImageFields.add(image.fieldName);
    return image.dataUrl;
  });

  return { html, referencedImageFields };
}

function buildAttachedImagesHtml(
  inlineImages: InlineImage[],
  referencedImageFields: Set<string>
): string {
  const attachedImages = inlineImages.filter((image) => !referencedImageFields.has(image.fieldName));
  if (attachedImages.length === 0) {
    return "";
  }

  const imageMarkup = attachedImages
    .map(
      (image) =>
        `<figure style="margin: 0 0 16px;"><img src="${image.dataUrl}" alt="${escapeHtml(
          image.fileName
        )}" style="max-width: 100%; height: auto;" /><figcaption style="font-size: 12px; color: #64748b; margin-top: 4px;">${escapeHtml(
          image.fileName
        )}</figcaption></figure>`
    )
    .join("");

  return `<section><h3>Attached images</h3>${imageMarkup}</section>`;
}

async function parseInboundPayload(formData: FormData): Promise<InboundEmailPayload> {
  const sender = readRequiredTextField(formData, "sender");
  const recipient = readRequiredTextField(formData, "recipient");
  const subject = readOptionalTextField(formData, "subject");
  const bodyPlain = readOptionalTextField(formData, "body-plain");
  const bodyHtmlParts = readOptionalTextFields(formData, "body-html");
  const strippedHtmlParts = readOptionalTextFields(formData, "stripped-html");
  const rawHtmlParts = bodyHtmlParts.length > 0 ? bodyHtmlParts : strippedHtmlParts;
  const bodyHtml = rawHtmlParts.join("<hr />");

  if (!isValidEmail(recipient)) {
    throw new HttpError(400, "Invalid recipient email format.");
  }

  const inlineImages = await readInlineImages(formData);
  const contentIdMap = parseContentIdMap(formData);
  const { html: bodyHtmlWithInlineImages, referencedImageFields } = replaceCidImageReferences(
    bodyHtml,
    contentIdMap,
    inlineImages
  );
  const attachedImagesHtml = buildAttachedImagesHtml(inlineImages, referencedImageFields);
  const renderedBodyHtml = [bodyHtmlWithInlineImages, attachedImagesHtml]
    .filter((htmlPart) => htmlPart.trim().length > 0)
    .join("<hr />");

  return {
    sender,
    recipient,
    subject,
    bodyPlain,
    bodyHtml: renderedBodyHtml
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

    const emailPayload = await parseInboundPayload(formData);

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
      body_plain: emailPayload.bodyPlain,
      body_html: emailPayload.bodyHtml
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
