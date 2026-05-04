"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
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

function getLocalDateTimeMinValue(date: Date): string {
  const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localTime.toISOString().slice(0, 16);
}

function isExpiredDate(expiresAt: string | null, nowTimestamp: number): boolean {
  if (!expiresAt) {
    return false;
  }

  const parsedDate = new Date(expiresAt);
  if (Number.isNaN(parsedDate.getTime())) {
    return false;
  }

  return parsedDate.getTime() <= nowTimestamp;
}

function formatExpirationLabel(value: string | null): string {
  if (!value) {
    return "No expiration";
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return "Invalid date";
  }

  return new Intl.DateTimeFormat("en-US", {
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
  const [minExpiresAt, setMinExpiresAt] = useState<string>("");

  useEffect(() => {
    setMinExpiresAt(getLocalDateTimeMinValue(new Date()));
  }, []);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="user_id" className="mb-1 block text-sm font-medium text-slate-700">
            User
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
              Select a user
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
            Expires at
          </label>
          <input
            id="expires_at"
            name="expires_at"
            type="datetime-local"
            min={minExpiresAt || undefined}
            disabled={!hasUsers}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100"
          />
          <p className="mt-1 text-xs text-slate-500">
            If left blank, access remains active until revoked.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton
          label="Grant Access"
          pendingLabel="Saving..."
          disabled={!hasUsers}
          className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        />
        {!hasUsers && <p className="text-sm text-slate-500">No users available.</p>}
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
            placeholder="user@company.com"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500"
          />
        </div>

        <div>
          <label
            htmlFor="new_user_password"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Password
          </label>
          <input
            id="new_user_password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            minLength={8}
            placeholder="Minimum 8 characters"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton
          label="Create User"
          pendingLabel="Creating..."
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
    return <span className="text-xs text-slate-400">No actions</span>;
  }

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="rule_id" value={ruleId} />
      <SubmitButton
        label="Revoke"
        pendingLabel="Revoking..."
        className="inline-flex items-center rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70"
      />
      {state.status === "error" && state.message && (
        <p className="text-xs text-red-700">{state.message}</p>
      )}
    </form>
  );
}

export function AdminPanel({ users, filteredRules, activeTab, fetchError }: AdminPanelProps) {
  const nowTimestamp = Date.now();

  return (
    <section className="space-y-6">
      {fetchError && (
        <section className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {fetchError}
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">Create New User</h2>
        <div className="mt-4">
          <CreateUserForm />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">Users</h2>

        {users.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">No users registered in profiles.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2 font-medium">User (Email)</th>
                  <th className="px-3 py-2 font-medium">Role</th>
                  <th className="px-3 py-2 font-medium">Active Rules</th>
                  <th className="px-3 py-2 font-medium">Inactive Rules</th>
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
        <h2 className="text-lg font-semibold text-slate-900">Grant New Access</h2>
        <div className="mt-4">
          <CreateAccessRuleForm users={users} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">Access Rules</h2>
        <div className="mt-4 border-b border-slate-200">
          <nav className="-mb-px flex items-center gap-1" aria-label="Access rule tabs">
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
              Active
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
              Inactive
            </Link>
          </nav>
        </div>

        {filteredRules.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">No access rules registered.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2 font-medium">Rule ID</th>
                  <th className="px-3 py-2 font-medium">User (Email)</th>
                  <th className="px-3 py-2 font-medium">Role</th>
                  <th className="px-3 py-2 font-medium">Prefix</th>
                  <th className="px-3 py-2 font-medium">Expiration</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRules.map((rule) => {
                  const ruleIsExpired = rule.is_active && isExpiredDate(rule.expires_at, nowTimestamp);

                  return (
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
                        {ruleIsExpired ? (
                          <span className="inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
                            Expired
                          </span>
                        ) : rule.is_active ? (
                          <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <RevokeRuleForm ruleId={rule.id} isActive={rule.is_active} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
