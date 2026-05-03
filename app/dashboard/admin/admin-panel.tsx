"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { adminCreateUser, createAccessRule, revokeAccessRule } from "./actions";
import type { AdminActionState } from "./actions";

export type AccessRuleRecord = {
  id: number;
  user_id: string;
  recipient_prefix: string;
  expires_at: string | null;
  is_active: boolean;
};

export type AdminPanelUser = {
  id: string;
  email: string | null;
  role: string;
  rules: AccessRuleRecord[];
};

export type AccessRuleTab = "active" | "inactive";

export type AccessRuleTableRow = AccessRuleRecord & {
  user_email: string | null;
  user_role: string;
};

type AdminPanelProps = {
  users: AdminPanelUser[];
  filteredRules: AccessRuleTableRow[];
  activeTab: AccessRuleTab;
  fetchError: string | null;
};

const INITIAL_ACTION_STATE: AdminActionState = {
  status: "idle",
  message: ""
};

function formatExpirationLabel(value: string | null): string {
  if (!value) {
    return "Sin expiracion";
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return "Fecha invalida";
  }

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(parsedDate);
}

function FeedbackMessage({ state }: { state: AdminActionState }) {
  if (state.status === "idle" || !state.message) {
    return null;
  }

  if (state.status === "error") {
    return (
      <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {state.message}
      </p>
    );
  }

  return (
    <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
      {state.message}
    </p>
  );
}

type SubmitButtonProps = {
  label: string;
  pendingLabel: string;
  className: string;
  disabled?: boolean;
};

function SubmitButton({
  label,
  pendingLabel,
  className,
  disabled = false
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const isDisabled = pending || disabled;

  return (
    <button
      type="submit"
      disabled={isDisabled}
      className={className}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

function CreateAccessRuleForm({ users }: { users: AdminPanelUser[] }) {
  const [state, formAction] = useActionState(createAccessRule, INITIAL_ACTION_STATE);
  const hasUsers = users.length > 0;

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="user_id" className="mb-1 block text-sm font-medium text-slate-700">
            Usuario
          </label>
          <select
            id="user_id"
            name="user_id"
            required
            defaultValue=""
            disabled={!hasUsers}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            <option value="" disabled>
              Selecciona un usuario
            </option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.email ?? user.id} ({user.role})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="recipient_prefix"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Recipient Prefix
          </label>
          <input
            id="recipient_prefix"
            name="recipient_prefix"
            type="text"
            required
            maxLength={120}
            placeholder="example-prefix"
            disabled={!hasUsers}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100"
          />
        </div>

        <div>
          <label htmlFor="expires_at" className="mb-1 block text-sm font-medium text-slate-700">
            Expira En
          </label>
          <input
            id="expires_at"
            name="expires_at"
            type="datetime-local"
            disabled={!hasUsers}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100"
          />
          <p className="mt-1 text-xs text-slate-500">
            Si lo dejas en blanco, el acceso no expira hasta que se revoque.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton
          label="Asignar Acceso"
          pendingLabel="Guardando..."
          disabled={!hasUsers}
          className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        />
        {!hasUsers && <p className="text-sm text-slate-500">No hay usuarios disponibles.</p>}
      </div>

      <FeedbackMessage state={state} />
    </form>
  );
}

function CreateUserForm() {
  const [state, formAction] = useActionState(adminCreateUser, INITIAL_ACTION_STATE);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="new_user_email" className="mb-1 block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="new_user_email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="usuario@empresa.com"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500"
          />
        </div>

        <div>
          <label
            htmlFor="new_user_password"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Contrasena
          </label>
          <input
            id="new_user_password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            minLength={8}
            placeholder="Minimo 8 caracteres"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton
          label="Crear Usuario"
          pendingLabel="Creando..."
          className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        />
      </div>

      <FeedbackMessage state={state} />
    </form>
  );
}

function RevokeRuleForm({ ruleId, isActive }: { ruleId: number; isActive: boolean }) {
  const [state, formAction] = useActionState(revokeAccessRule, INITIAL_ACTION_STATE);

  if (!isActive) {
    return <span className="text-xs text-slate-400">Sin acciones</span>;
  }

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="rule_id" value={ruleId} />
      <SubmitButton
        label="Revocar"
        pendingLabel="Revocando..."
        className="inline-flex items-center rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70"
      />
      {state.status === "error" && state.message && (
        <p className="text-xs text-red-700">{state.message}</p>
      )}
    </form>
  );
}

export function AdminPanel({ users, filteredRules, activeTab, fetchError }: AdminPanelProps) {

  return (
    <section className="space-y-6">
      {fetchError && (
        <section className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {fetchError}
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">Crear Nuevo Usuario</h2>
        <div className="mt-4">
          <CreateUserForm />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">Usuarios</h2>

        {users.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">No hay usuarios registrados en profiles.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2 font-medium">Usuario (Email)</th>
                  <th className="px-3 py-2 font-medium">Rol</th>
                  <th className="px-3 py-2 font-medium">Reglas Activas</th>
                  <th className="px-3 py-2 font-medium">Reglas Inactivas</th>
                  <th className="px-3 py-2 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const activeRules = user.rules.filter((rule) => rule.is_active).length;
                  const inactiveRules = user.rules.length - activeRules;

                  return (
                    <tr key={user.id} className="border-b border-slate-100 text-sm text-slate-700">
                      <td className="px-3 py-3">
                        <p className="text-sm font-medium text-slate-800">{user.email ?? user.id}</p>
                        {user.email && (
                          <p className="font-mono text-xs text-slate-500">{user.id}</p>
                        )}
                      </td>
                      <td className="px-3 py-3">{user.role}</td>
                      <td className="px-3 py-3">{activeRules}</td>
                      <td className="px-3 py-3">{inactiveRules}</td>
                      <td className="px-3 py-3">{user.rules.length}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">Asignar Nuevo Acceso</h2>
        <div className="mt-4">
          <CreateAccessRuleForm users={users} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">Reglas de Acceso</h2>
        <div className="mt-4 border-b border-slate-200">
          <nav className="-mb-px flex items-center gap-1" aria-label="Tabs de reglas de acceso">
            <Link
              href="?tab=active"
              scroll={false}
              replace
              className={
                activeTab === "active"
                  ? "inline-flex items-center border-b-2 border-blue-600 px-4 py-2 text-sm font-semibold text-blue-700"
                  : "inline-flex items-center border-b-2 border-transparent px-4 py-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
              }
            >
              Activas
            </Link>
            <Link
              href="?tab=inactive"
              scroll={false}
              replace
              className={
                activeTab === "inactive"
                  ? "inline-flex items-center border-b-2 border-blue-600 px-4 py-2 text-sm font-semibold text-blue-700"
                  : "inline-flex items-center border-b-2 border-transparent px-4 py-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
              }
            >
              Inactivas
            </Link>
          </nav>
        </div>

        {filteredRules.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">No hay reglas de acceso registradas.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2 font-medium">Rule ID</th>
                  <th className="px-3 py-2 font-medium">Usuario (Email)</th>
                  <th className="px-3 py-2 font-medium">Rol</th>
                  <th className="px-3 py-2 font-medium">Prefix</th>
                  <th className="px-3 py-2 font-medium">Expiracion</th>
                  <th className="px-3 py-2 font-medium">Estado</th>
                  <th className="px-3 py-2 font-medium text-right">Accion</th>
                </tr>
              </thead>
              <tbody>
                {filteredRules.map((rule) => (
                  <tr key={rule.id} className="border-b border-slate-100 text-sm text-slate-700">
                    <td className="px-3 py-3 font-mono">{rule.id}</td>
                    <td className="px-3 py-3">
                      <p className="text-sm font-medium text-slate-800">
                        {rule.user_email ?? rule.user_id}
                      </p>
                      {rule.user_email && (
                        <p className="font-mono text-xs text-slate-500">{rule.user_id}</p>
                      )}
                    </td>
                    <td className="px-3 py-3">{rule.user_role}</td>
                    <td className="px-3 py-3">{rule.recipient_prefix}</td>
                    <td className="px-3 py-3">{formatExpirationLabel(rule.expires_at)}</td>
                    <td className="px-3 py-3">
                      {rule.is_active ? (
                        <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                          Activa
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700">
                          Inactiva
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <RevokeRuleForm ruleId={rule.id} isActive={rule.is_active} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
