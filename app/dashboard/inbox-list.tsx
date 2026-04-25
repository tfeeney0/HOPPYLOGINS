"use client";

import DOMPurify from "dompurify";
import { useEffect, useId, useMemo, useRef, useState } from "react";

if (typeof window !== "undefined") {
  // Avoid duplicated hooks in HMR development cycles.
  DOMPurify.removeAllHooks();
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    const element = node as Element;
    if (element.tagName?.toLowerCase() === "a") {
      element.setAttribute("target", "_blank");
      element.setAttribute("rel", "noopener noreferrer");
    }
  });
}

export type EmailRecord = {
  id: number;
  sender: string | null;
  recipient: string | null;
  subject: string | null;
  body_plain: string | null;
  body_html: string | null;
  created_at: string | null;
};

type InboxListProps = {
  emails: EmailRecord[];
};

function isSameCalendarDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function formatFriendlyDate(value: string | null): string {
  if (!value) {
    return "Sin fecha";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Sin fecha";
  }

  const now = new Date();
  if (isSameCalendarDay(date, now)) {
    return "Hoy";
  }

  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameCalendarDay(date, yesterday)) {
    return "Ayer";
  }

  const formatOptions: Intl.DateTimeFormatOptions =
    date.getFullYear() === now.getFullYear()
      ? { day: "2-digit", month: "short" }
      : { day: "2-digit", month: "short", year: "numeric" };

  return new Intl.DateTimeFormat("es-AR", formatOptions).format(date);
}

function sanitizeEmailHtml(rawHtml: string | null): string {
  if (!rawHtml) {
    return "";
  }

  return DOMPurify.sanitize(rawHtml, {
    USE_PROFILES: { html: true }
  });
}

function EmailViewerSlideOver({
  email,
  onClose
}: {
  email: EmailRecord;
  onClose: () => void;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLElement | null>(null);

  const sanitizedHtml = useMemo(() => sanitizeEmailHtml(email.body_html), [email.body_html]);
  const hasHtmlContent = sanitizedHtml.trim().length > 0;
  const hasPlainContent = (email.body_plain ?? "").trim().length > 0;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousActiveElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusableSelector = [
      "a[href]",
      "button:not([disabled])",
      "textarea:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "[tabindex]:not([tabindex='-1'])"
    ].join(",");

    document.body.style.overflow = "hidden";

    const getFocusableElements = (): HTMLElement[] => {
      const panel = panelRef.current;
      if (!panel) {
        return [];
      }

      return Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (element) => !element.hasAttribute("disabled")
      );
    };

    const focusFirstElement = () => {
      const firstFocusable = getFocusableElements()[0];
      firstFocusable?.focus();
    };

    const animationFrameId = window.requestAnimationFrame(focusFirstElement);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey) {
        if (activeElement === firstElement || !panelRef.current?.contains(activeElement)) {
          event.preventDefault();
          lastElement.focus();
        }
        return;
      }

      if (activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousActiveElement?.focus();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[110]">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/35 backdrop-blur-sm"
        aria-label="Cerrar visor de correo"
        onClick={onClose}
      />

      <aside
        ref={panelRef}
        className="absolute inset-y-0 right-0 flex h-full w-full max-w-[56rem] flex-col border-l border-slate-200 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {formatFriendlyDate(email.created_at)}
            </p>
            <h2 id={titleId} className="mt-1 truncate text-base font-semibold text-slate-900 sm:text-lg">
              {email.subject || "(Sin asunto)"}
            </h2>
            <p className="mt-1 truncate text-sm text-slate-600">
              De: {email.sender || "(Remitente desconocido)"}
            </p>
            <p className="truncate text-sm text-slate-600">
              Para: {email.recipient || "(Sin destinatario)"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-300 text-slate-700 transition-colors hover:bg-slate-100"
            aria-label="Cerrar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-6 w-6"
              aria-hidden="true"
            >
              <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6">
          {hasHtmlContent ? (
            <article
              className="prose prose-sm prose-slate max-w-none rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
              dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            />
          ) : hasPlainContent ? (
            <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {email.body_plain}
              </p>
            </article>
          ) : (
            <article className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm sm:p-6">
              Este correo no contiene contenido visible.
            </article>
          )}
        </div>
      </aside>
    </div>
  );
}

export function InboxList({ emails }: InboxListProps) {
  const [selectedEmail, setSelectedEmail] = useState<EmailRecord | null>(null);

  if (emails.length === 0) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h2 className="text-base font-semibold text-slate-800">Sin correos visibles</h2>
        <p className="mt-2 text-sm text-slate-600">
          Cuando haya mensajes autorizados por RLS, apareceran aqui.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <ul className="divide-y divide-slate-100">
        {emails.map((email) => (
          <li key={email.id}>
            <button
              type="button"
              onClick={() => setSelectedEmail(email)}
              className="w-full px-4 py-4 text-left transition-colors hover:bg-slate-50 focus:bg-slate-50 focus:outline-none sm:px-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {email.sender || "(Remitente desconocido)"}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-slate-800">
                    {email.subject || "(Sin asunto)"}
                  </p>
                </div>
                <p className="shrink-0 text-xs font-medium text-slate-500">
                  {formatFriendlyDate(email.created_at)}
                </p>
              </div>
            </button>
          </li>
        ))}
      </ul>

      {selectedEmail && (
        <EmailViewerSlideOver email={selectedEmail} onClose={() => setSelectedEmail(null)} />
      )}
    </section>
  );
}
