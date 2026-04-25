"use client";

import { useState } from "react";

export type EmailRecord = {
  id: number;
  sender: string;
  recipient: string;
  subject: string;
  body_plain: string;
  created_at: string;
};

type InboxListProps = {
  emails: EmailRecord[];
};

function formatFriendlyDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Sin fecha";
  }

  const now = new Date();
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const nowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayDifference = Math.round(
    (nowStart.getTime() - dateStart.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (dayDifference === 0) {
    return "Hoy";
  }

  if (dayDifference === 1) {
    return "Ayer";
  }

  const formatOptions: Intl.DateTimeFormatOptions =
    date.getFullYear() === now.getFullYear()
      ? { day: "2-digit", month: "short" }
      : { day: "2-digit", month: "short", year: "numeric" };

  return new Intl.DateTimeFormat("es-AR", formatOptions).format(date);
}

export function InboxList({ emails }: InboxListProps) {
  const [openEmailId, setOpenEmailId] = useState<number | null>(null);

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
        {emails.map((email) => {
          const isOpen = openEmailId === email.id;

          return (
            <li key={email.id}>
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpenEmailId(isOpen ? null : email.id)}
                className="w-full px-4 py-4 text-left transition-colors hover:bg-slate-50 focus:bg-slate-50 focus:outline-none sm:px-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {email.sender}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-slate-800">
                      {email.subject || "(Sin asunto)"}
                    </p>
                  </div>
                  <p className="shrink-0 text-xs font-medium text-slate-500">
                    {formatFriendlyDate(email.created_at)}
                  </p>
                </div>

                {isOpen && (
                  <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Para: {email.recipient}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {email.body_plain || "(Sin contenido)"}
                    </p>
                  </div>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
