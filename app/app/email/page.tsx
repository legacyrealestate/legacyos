"use client";

import AppShell from "@/app/components/AppShell";
import { useCallback, useEffect, useMemo, useState } from "react";

type Address =
  | string
  | { value?: string; emailAddress?: { name?: string; address?: string } };
type Message = {
  id: string;
  sender: Address | null;
  recipients: Address[];
  cc: Address[];
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  attachment_metadata: Array<{
    filename?: string;
    name?: string;
    size?: number;
  }>;
  provider_sent_at: string | null;
  created_at: string;
  status: string;
  is_read: boolean;
  direction: string;
};
type Thread = {
  id: string;
  provider: string;
  subject: string | null;
  urgency: string;
  status: string;
  last_message_at: string | null;
  assigned_to: string | null;
  internal_notes: string | null;
  tags: string[];
  follow_up_at: string | null;
  automation_disabled: boolean;
  alma_classification: string | null;
  alma_summary: string | null;
  alma_questions: unknown[];
  alma_requested_actions: unknown[];
  alma_deadlines: unknown[];
  alma_promises: unknown[];
  alma_reason: string | null;
  alma_draft_text: string | null;
  primary_classification?: string | null;
  classification_confidence?: number | null;
  classification_explanation?: string | null;
  automation_decision?: string | null;
  extracted_fields?: Record<string, unknown>;
  contact?: { full_name: string; contact_type: string } | null;
  lead?: {
    status: string;
    desired_property: string | null;
    next_follow_up_at: string | null;
    lead_temperature: "Hot" | "Warm" | "Cold";
    lead_score: number;
    lead_score_reasons: string[];
  } | null;
  ticket?: { status: string; property: string } | null;
  intake_job?: { status: string } | null;
  email_messages: Message[];
};
type Connection = {
  provider: string;
  account_email: string | null;
  status: string;
  last_sync_at: string | null;
  last_success_at: string | null;
  last_error: string | null;
};
type Action = {
  id: string;
  action: string;
  status: string;
  source_message_id: string;
  created_at: string;
  updated_at: string;
  last_error: string | null;
  approved_at: string | null;
};
type Staff = { id: string; full_name: string };
type Audit = {
  id: string;
  action: string;
  entity_id: string;
  created_at: string;
  detail: Record<string, unknown>;
};
const folders = [
  "All mail",
  "Leads",
  "Hot leads",
  "Warm leads",
  "Cold leads",
  "Regular",
  "Maintenance",
  "Emergencies",
  "Needs response",
  "Awaiting approval",
  "Follow-up",
  "Unread",
  "Archived",
];
const address = (value: Address | null) =>
  typeof value === "string"
    ? value
    : value?.value || value?.emailAddress?.address || "Unknown sender";
const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleString() : "Never";

export default function EmailPage() {
  const [threads, setThreads] = useState<Thread[]>([]),
    [connections, setConnections] = useState<Connection[]>([]),
    [actions, setActions] = useState<Action[]>([]),
    [staff, setStaff] = useState<Staff[]>([]),
    [audit, setAudit] = useState<Audit[]>([]);
  const [selectedId, setSelectedIdState] = useState<string | null>(null),
    [folder, setFolder] = useState("All mail"),
    [query, setQuery] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [connectionMessage] = useState(() => {
    if (typeof window === "undefined") return { tone: "notice", text: "" };
    const params = new URLSearchParams(window.location.search);
    if (params.get("connection_error") === "microsoft_not_configured")
      return {
        tone: "error",
        text: "Microsoft 365 connection is not configured yet. An administrator must add the Microsoft OAuth values in Vercel and redeploy.",
      };
    if (params.get("connected") === "microsoft")
      return {
        tone: "notice",
        text: "Microsoft 365 is connected. Select Sync Microsoft 365 to import the shared Inbox.",
      };
    return { tone: "notice", text: "" };
  });
  const [composer, setComposer] = useState({
    action: "reply" as "draft" | "send" | "reply" | "reply_all" | "forward",
    to: "",
    subject: "",
    body: "",
  });
  const [edit, setEdit] = useState({
    assignedTo: "",
    internalNotes: "",
    tags: "",
    followUpAt: "",
    automationDisabled: false,
  });
  const selected = threads.find((thread) => thread.id === selectedId) || null;
  const selectedActions = selected
    ? actions.filter((action) =>
        selected.email_messages.some(
          (message) => message.id === action.source_message_id,
        ),
      )
    : [];
  const pendingAction = selectedActions.find(
    (action) => action.status === "waiting_approval",
  );
  function chooseThread(thread: Thread | null) {
    setSelectedIdState(thread?.id || null);
    if (!thread) return;
    const latest = [...thread.email_messages].sort(
      (a, b) =>
        Date.parse(b.provider_sent_at || b.created_at) -
        Date.parse(a.provider_sent_at || a.created_at),
    )[0];
    setEdit({
      assignedTo: thread.assigned_to || "",
      internalNotes: thread.internal_notes || "",
      tags: (thread.tags || []).join(", "),
      followUpAt: thread.follow_up_at?.slice(0, 16) || "",
      automationDisabled: thread.automation_disabled,
    });
    setComposer((value) => ({
      ...value,
      subject: thread.subject?.toLowerCase().startsWith("re:")
        ? thread.subject
        : `Re: ${thread.subject || ""}`,
      to: latest ? address(latest.sender) : "",
      body: thread.alma_draft_text || "",
    }));
  }
  function setSelectedId(id: string | null) {
    chooseThread(threads.find((thread) => thread.id === id) || null);
  }
  const load = useCallback(async () => {
    setError("");
    const response = await fetch("/api/email", { cache: "no-store" });
    const json = await response.json();
    if (!response.ok) setError(json.error || "Unable to load shared email.");
    else {
      const rows = json.threads || [];
      setThreads(rows);
      setConnections(json.connections || []);
      setActions(json.actions || []);
      setStaff(json.staff || []);
      setAudit(json.audit || []);
      chooseThread(
        rows.find((item: Thread) => item.id === selectedId) || rows[0] || null,
      );
    }
    setLoading(false);
  }, [selectedId]);
  useEffect(() => {
    let active = true;
    fetch("/api/email", { cache: "no-store" }).then(async (emailResponse) => {
      const email = await emailResponse.json();
      if (!active) return;
      if (!emailResponse.ok)
        setError(email.error || "Unable to load shared email.");
      else {
        const rows = email.threads || [];
        setThreads(rows);
        setConnections(email.connections || []);
        setActions(email.actions || []);
        setStaff(email.staff || []);
        setAudit(email.audit || []);
        const requested = new URLSearchParams(window.location.search).get(
          "thread",
        );
        chooseThread(
          rows.find((item: Thread) => item.id === requested) || rows[0] || null,
        );
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);
  const filtered = useMemo(
    () =>
      threads.filter((thread) => {
        const messages = thread.email_messages || [],
          unread = messages.some((message) => !message.is_read),
          archived = messages.every((message) => message.status === "archived");
        const matchesFolder =
          folder === "All mail"
            ? !archived
            : folder === "Unread"
              ? unread
              : folder === "Leads"
                ? thread.primary_classification === "Lead/leasing inquiry"
                : folder === "Hot leads"
                  ? thread.lead?.lead_temperature === "Hot"
                  : folder === "Warm leads"
                    ? thread.lead?.lead_temperature === "Warm"
                    : folder === "Cold leads"
                      ? thread.lead?.lead_temperature === "Cold"
                      : folder === "Regular"
                        ? thread.primary_classification === "General"
                        : folder === "Maintenance"
                          ? Boolean(thread.ticket)
                          : folder === "Emergencies"
                            ? thread.urgency === "Emergency"
                            : folder === "Needs response"
                              ? !["Replied", "Closed"].includes(thread.status)
                              : folder === "Awaiting approval"
                                ? actions.some(
                                    (action) =>
                                      action.status === "waiting_approval" &&
                                      messages.some(
                                        (message) =>
                                          message.id ===
                                          action.source_message_id,
                                      ),
                                  )
                                : folder === "Follow-up"
                                  ? Boolean(
                                      thread.follow_up_at ||
                                      thread.lead?.next_follow_up_at,
                                    )
                                  : folder === "Archived"
                                    ? archived
                                    : true;
        return (
          matchesFolder &&
          (!query ||
            `${thread.subject} ${messages.map((message) => `${address(message.sender)} ${message.body_text}`).join(" ")}`
              .toLowerCase()
              .includes(query.toLowerCase()))
        );
      }),
    [threads, folder, query, actions],
  );

  async function sync() {
    setBusy("sync");
    const response = await fetch("/api/email", { method: "POST" });
    const json = await response.json();
    if (!response.ok) setError(json.error || "Email synchronization failed.");
    else {
      setNotice(
        `Imported ${json.imported} messages from ${json.connections} mailbox connections.`,
      );
      await load();
    }
    setBusy("");
  }
  function connectMicrosoft() {
    window.location.assign("/api/oauth/microsoft/start?returnTo=%2Femail");
  }
  async function messageAction(action: "read" | "unread" | "archive") {
    const message = selected?.email_messages[0];
    if (!message) return;
    setBusy(action);
    const response = await fetch(`/api/email/${message.id}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const json = await response.json();
    if (!response.ok) setError(json.error);
    else {
      setNotice(`${action.replaceAll("_", " ")} completed.`);
      await load();
    }
    setBusy("");
  }
  async function submit(action = composer.action) {
    const message = selected?.email_messages[0];
    if (!message) return;
    setBusy("compose");
    const response = await fetch(`/api/email/${message.id}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...composer,
        action,
        to: composer.to
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        idempotencyKey: crypto.randomUUID(),
      }),
    });
    const json = await response.json();
    if (!response.ok) setError(json.error || "Email action failed.");
    else {
      setNotice(
        json.approvalRequired
          ? "Draft is awaiting administrator approval."
          : action === "draft"
            ? "Draft saved with the provider."
            : "Provider accepted the email action.",
      );
      await load();
    }
    setBusy("");
  }
  async function updateThread(extra: Record<string, unknown> = {}) {
    if (!selected) return;
    setBusy("thread");
    const response = await fetch(`/api/email/threads/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assignedTo: edit.assignedTo || null,
        internalNotes: edit.internalNotes,
        tags: edit.tags
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        followUpAt: edit.followUpAt
          ? new Date(edit.followUpAt).toISOString()
          : null,
        automationDisabled: edit.automationDisabled,
        ...extra,
      }),
    });
    const json = await response.json();
    if (!response.ok) setError(json.error || "Unable to update thread.");
    else {
      setNotice("Thread workspace updated.");
      await load();
    }
    setBusy("");
  }
  async function approve() {
    if (!pendingAction) return;
    setBusy("approve");
    const response = await fetch(
      `/api/email/actions/${pendingAction.id}/approve`,
      { method: "POST" },
    );
    const json = await response.json();
    if (!response.ok) setError(json.error || "Approval failed.");
    else {
      setNotice("Approved and sent through the provider.");
      await load();
    }
    setBusy("");
  }
  async function reject() {
    if (!pendingAction) return;
    const reason = window.prompt("Why should this ALMA draft be rejected?");
    if (!reason) return;
    setBusy("reject");
    const response = await fetch(`/api/email/actions/${pendingAction.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject", reason }),
    });
    const json = await response.json();
    if (!response.ok) setError(json.error || "Unable to reject draft.");
    else {
      setNotice("ALMA draft rejected and audited.");
      await load();
    }
    setBusy("");
  }
  async function regenerate() {
    if (!selected) return;
    setBusy("regenerate");
    const response = await fetch(
      `/api/email/threads/${selected.id}/regenerate`,
      { method: "POST" },
    );
    const json = await response.json();
    if (!response.ok)
      setError(json.error || "Unable to generate a tailored reply.");
    else {
      const draft = String(json.draft || "");
      setComposer((value) => ({ ...value, body: draft }));
      setThreads((current) =>
        current.map((thread) =>
          thread.id === selected.id
            ? { ...thread, alma_draft_text: draft }
            : thread,
        ),
      );
      setNotice(
        "ALMA prepared a reply using this email and lead details. Review it, then click Send from connected inbox.",
      );
    }
    setBusy("");
  }
  async function sendFromInbox() {
    const message = selected?.email_messages[0];
    if (!message || !composer.body.trim()) return;
    setBusy("send");
    const response = await fetch(`/api/email/${message.id}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...composer,
        to: composer.to
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        idempotencyKey: crypto.randomUUID(),
      }),
    });
    const json = await response.json();
    if (!response.ok) setError(json.error || "Email could not be sent.");
    else {
      setNotice("Sent from the connected Legacy Microsoft 365 inbox.");
      await load();
    }
    setBusy("");
  }

  const connected = connections.filter(
    (connection) => connection.status === "connected",
  );
  return (
    <AppShell>
      <div className="legacy-email">
        <section className="liquid-card rounded-[28px] border border-white/90 bg-white/75 p-6 shadow-[0_22px_50px_rgba(25,42,32,.09)] md:p-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[.28em] text-emerald-700">
                Microsoft 365 lead desk
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
                Leads
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500">
                New messages become organized leads, callback tasks, or
                staff-review items. Nothing external sends without the approval
                rules you enable.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {connections
                  .filter((connection) => connection.provider === "microsoft")
                  .map((connection) => (
                    <span
                      key={connection.provider}
                      className={`rounded-full border px-3 py-1 text-xs ${connection.status === "connected" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}
                    >
                      Microsoft 365:{" "}
                      {connection.account_email ||
                        connection.status.replaceAll("_", " ")}
                    </span>
                  ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSelectedId(threads[0]?.id || null);
                  setComposer({
                    action: "send",
                    to: "",
                    subject: "",
                    body: "",
                  });
                }}
                className="h-11 rounded-xl border border-black/[.10] bg-white px-5 text-sm hover:bg-zinc-50"
              >
                Compose
              </button>
              <button
                onClick={sync}
                disabled={
                  !!busy ||
                  !connections.some(
                    (connection) =>
                      connection.provider === "microsoft" &&
                      connection.status === "connected",
                  )
                }
                className="h-11 rounded-xl bg-[#12643e] px-5 text-sm text-white disabled:cursor-not-allowed disabled:opacity-45"
              >
                {busy === "sync" ? "Synchronizing..." : "Sync Microsoft 365"}
              </button>
            </div>
          </div>
        </section>
        {(error || notice || connectionMessage.text) && (
          <div
            role="status"
            className={`mt-5 rounded-xl border p-4 text-sm ${error || connectionMessage.tone === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}
          >
            {error || notice || connectionMessage.text}
          </div>
        )}
        {!loading &&
          connections.some(
            (connection) =>
              connection.provider === "microsoft" &&
              connection.status === "needs_reconnect",
          ) && (
            <State
              title="Mailbox authorization expired"
              detail="Reconnect the shared Microsoft 365 mailbox before syncing. LegacyOS keeps the mailbox token encrypted on the server."
              action={
                <button onClick={connectMicrosoft} disabled={!!busy}>
                  Reconnect Microsoft 365
                </button>
              }
            />
          )}
        {!loading &&
          !connections.some(
            (connection) => connection.provider === "microsoft",
          ) && (
            <State
              title="Connect the shared leasing inbox"
              detail="Connect Microsoft 365 here. The first import reads the Inbox; later syncs use Microsoft delta updates so LegacyOS only brings in changes."
              action={
                <button onClick={connectMicrosoft} disabled={!!busy}>
                  Connect Microsoft 365
                </button>
              }
            />
          )}
        {!loading && connected.length > 0 && threads.length === 0 && (
          <State
            title="Ready to import the shared mailbox"
            detail="The first import reads the connected inbox. Future syncs use incremental updates, so messages are not repeatedly downloaded."
            action={<button onClick={sync}>Import and analyze email</button>}
          />
        )}
        {loading ? (
          <State
            title="Loading shared inbox"
            detail="Reading provider threads and approval state…"
          />
        ) : (
          threads.length > 0 && (
            <section className="mt-5 grid min-h-[760px] overflow-hidden rounded-[24px] border border-black/[.06] bg-white lg:grid-cols-[210px_330px_1fr]">
              <nav
                aria-label="Mailbox folders"
                className="border-b border-black/[.06] bg-zinc-50/70 p-3 lg:border-b-0 lg:border-r"
              >
                <input
                  aria-label="Search email"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search mail"
                  className="mb-3 h-10 w-full rounded-lg border bg-white px-3 text-sm"
                />
                {folders.map((item) => (
                  <button
                    key={item}
                    onClick={() => setFolder(item)}
                    className={`mb-1 flex w-full justify-between rounded-lg px-3 py-2.5 text-left text-sm ${folder === item ? "bg-black text-white" : "hover:bg-white"}`}
                  >
                    <span>{item}</span>
                    <span className="text-xs opacity-60">
                      {item === folder ? filtered.length : ""}
                    </span>
                  </button>
                ))}
              </nav>
              <div className="max-h-[860px] overflow-y-auto border-b border-black/[.06] lg:border-b-0 lg:border-r">
                <div className="sticky top-0 z-10 border-b bg-white/95 p-4 text-xs text-zinc-500 backdrop-blur">
                  {folder} · {filtered.length}
                </div>
                {filtered.map((thread) => {
                  const latest = [...thread.email_messages].sort(
                    (a, b) =>
                      Date.parse(b.provider_sent_at || b.created_at) -
                      Date.parse(a.provider_sent_at || a.created_at),
                  )[0];
                  return (
                    <button
                      key={thread.id}
                      onClick={() => setSelectedId(thread.id)}
                      className={`w-full border-b border-black/[.05] p-4 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500 ${selectedId === thread.id ? "bg-[#f3f8f5]" : "hover:bg-zinc-50"}`}
                    >
                      <div className="flex justify-between gap-2">
                        <p
                          className={`truncate text-sm ${latest && !latest.is_read ? "font-semibold" : "font-medium"}`}
                        >
                          {address(latest?.sender || null)}
                        </p>
                        {thread.lead ? (
                          <Temperature
                            value={thread.lead.lead_temperature}
                            score={thread.lead.lead_score}
                          />
                        ) : (
                          <Urgency value={thread.urgency} />
                        )}
                      </div>
                      <p className="mt-2 truncate text-sm">
                        {thread.subject || "(No subject)"}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500">
                        {latest?.body_text || "No message preview"}
                      </p>
                      <div className="mt-3 flex justify-between text-[10px] uppercase text-zinc-400">
                        <span>
                          {thread.primary_classification || thread.status}
                        </span>
                        <span>{formatDate(thread.last_message_at)}</span>
                      </div>
                    </button>
                  );
                })}
                {filtered.length === 0 && (
                  <p className="p-6 text-sm text-zinc-500">
                    No threads match this folder.
                  </p>
                )}
              </div>
              {selected && (
                <main className="min-w-0 p-5 md:p-6">
                  <header className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-2xl font-semibold">
                          {selected.subject || "(No subject)"}
                        </h2>
                        <Urgency value={selected.urgency} />
                      </div>
                      <p className="mt-2 text-xs text-zinc-400">
                        {selected.provider} ·{" "}
                        {connections.find(
                          (connection) =>
                            connection.provider === selected.provider,
                        )?.account_email || "Company mailbox"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() =>
                          messageAction(
                            selected.email_messages.some(
                              (message) => !message.is_read,
                            )
                              ? "read"
                              : "unread",
                          )
                        }
                        className="rounded-lg border px-3 py-2 text-xs"
                      >
                        {selected.email_messages.some(
                          (message) => !message.is_read,
                        )
                          ? "Mark read"
                          : "Mark unread"}
                      </button>
                      <button
                        onClick={() => messageAction("archive")}
                        className="rounded-lg border px-3 py-2 text-xs"
                      >
                        Archive
                      </button>
                    </div>
                  </header>
                  <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_280px]">
                    <div className="min-w-0 space-y-5">
                      <section className="max-h-[430px] space-y-3 overflow-y-auto rounded-xl border border-black/[.06] p-3">
                        {[...selected.email_messages]
                          .sort(
                            (a, b) =>
                              Date.parse(a.provider_sent_at || a.created_at) -
                              Date.parse(b.provider_sent_at || b.created_at),
                          )
                          .map((message) => (
                            <details
                              key={message.id}
                              open
                              className="rounded-lg bg-zinc-50 p-4"
                            >
                              <summary className="cursor-pointer list-none">
                                <div className="flex justify-between gap-4">
                                  <div>
                                    <p className="text-sm font-medium">
                                      {address(message.sender)}
                                    </p>
                                    <p className="mt-1 text-xs text-zinc-400">
                                      To:{" "}
                                      {(message.recipients || [])
                                        .map((value) => address(value))
                                        .join(", ") || "Unknown"}
                                    </p>
                                  </div>
                                  <time className="text-[10px] text-zinc-400">
                                    {formatDate(
                                      message.provider_sent_at ||
                                        message.created_at,
                                    )}
                                  </time>
                                </div>
                              </summary>
                              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                                {message.body_text || "No text body."}
                              </p>
                              {message.attachment_metadata?.length > 0 && (
                                <div className="mt-4 flex flex-wrap gap-2">
                                  {message.attachment_metadata.map(
                                    (file, index) => (
                                      <span
                                        key={index}
                                        className="rounded-lg border bg-white px-3 py-2 text-xs"
                                      >
                                        {file.filename ||
                                          file.name ||
                                          "Attachment"}
                                        {file.size
                                          ? ` · ${Math.ceil(file.size / 1024)} KB`
                                          : ""}
                                      </span>
                                    ),
                                  )}
                                </div>
                              )}
                            </details>
                          ))}
                      </section>
                      <section className="reply-studio rounded-xl border border-black/[.06] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[.22em] text-emerald-700">
                              Reply studio
                            </p>
                            <p className="mt-1 text-xs text-zinc-500">
                              ALMA writes the first draft. A staff member always
                              controls sending.
                            </p>
                          </div>
                          <button
                            onClick={regenerate}
                            disabled={!!busy}
                            className="alma-generate rounded-xl px-4 py-2 text-xs font-semibold disabled:opacity-50"
                          >
                            {busy === "regenerate"
                              ? "Writing reply…"
                              : "Generate tailored reply"}
                          </button>
                        </div>
                        <div className="mt-4 grid gap-3">
                          <input
                            aria-label="Recipients"
                            value={composer.to}
                            onChange={(e) =>
                              setComposer((v) => ({ ...v, to: e.target.value }))
                            }
                            placeholder="Recipients, comma separated"
                            className="h-10 rounded-lg border px-3 text-sm"
                          />
                          <input
                            aria-label="Email subject"
                            value={composer.subject}
                            onChange={(e) =>
                              setComposer((v) => ({
                                ...v,
                                subject: e.target.value,
                              }))
                            }
                            className="h-10 rounded-lg border px-3 text-sm"
                          />
                          <textarea
                            aria-label="Email response"
                            rows={8}
                            value={composer.body}
                            onChange={(e) =>
                              setComposer((v) => ({
                                ...v,
                                body: e.target.value,
                              }))
                            }
                            placeholder="Generate a response or write your own"
                            className="rounded-lg border p-3 text-sm"
                          />
                          <div className="flex flex-wrap gap-2">
                            <button
                              disabled={!!busy || !composer.body.trim()}
                              onClick={sendFromInbox}
                              className="send-from-inbox rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50"
                            >
                              {busy === "send"
                                ? "Sending…"
                                : "Send from connected inbox"}
                            </button>
                            <button
                              disabled={!!busy || !composer.body.trim()}
                              onClick={() => submit("draft")}
                              className="rounded-xl border px-4 py-2 text-sm disabled:opacity-50"
                            >
                              Save provider draft
                            </button>
                            {selected.alma_draft_text && (
                              <button
                                onClick={() =>
                                  setComposer((v) => ({
                                    ...v,
                                    body: selected.alma_draft_text || "",
                                  }))
                                }
                                className="rounded-xl border px-4 py-2 text-sm"
                              >
                                Use last ALMA draft
                              </button>
                            )}
                            {pendingAction && (
                              <>
                                <button
                                  onClick={approve}
                                  disabled={!!busy}
                                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm text-white"
                                >
                                  Approve and send queued email
                                </button>
                                <button
                                  onClick={reject}
                                  disabled={!!busy}
                                  className="rounded-xl border border-red-200 px-4 py-2 text-sm text-red-700"
                                >
                    Reject draft
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </section>
                    </div>
                    <aside className="space-y-4">
                      {selected.lead && (
                        <Side title="Lead qualification">
                          <Fact
                            label="Temperature"
                            value={`${selected.lead.lead_temperature} · ${selected.lead.lead_score}/100`}
                          />
                          <List
                            label="Why"
                            values={selected.lead.lead_score_reasons}
                          />
                          <Fact
                            label="Lead status"
                            value={selected.lead.status}
                          />
                        </Side>
                      )}
                      <Side title="ALMA intelligence">
                        <Fact
                          label="Category"
                          value={
                            selected.primary_classification ||
                            selected.alma_classification ||
                            "Not analyzed"
                          }
                        />
                        <Fact
                          label="Summary"
                          value={
                            selected.alma_summary || "No summary available"
                          }
                        />
                        <List
                          label="Requests"
                          values={selected.alma_requested_actions}
                        />
                        <List
                          label="Deadlines"
                          values={selected.alma_deadlines}
                        />
                        <Fact
                          label="Draft reason"
                          value={
                            selected.alma_reason || "No draft reason recorded"
                          }
                        />
                        {pendingAction?.last_error && (
                          <Fact
                            label="Approval reason"
                            value={pendingAction.last_error}
                          />
                        )}
                        <button
                          onClick={regenerate}
                          disabled={!!busy}
                          className="mt-3 w-full rounded-lg border px-3 py-2 text-xs"
                        >
                          Regenerate draft
                        </button>
                      </Side>
                      <Side title="Thread controls">
                        <Field label="Assign employee">
                          <select
                            value={edit.assignedTo}
                            onChange={(e) =>
                              setEdit((v) => ({
                                ...v,
                                assignedTo: e.target.value,
                              }))
                            }
                          >
                            <option value="">Unassigned</option>
                            {staff.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.full_name}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Tags">
                          <input
                            value={edit.tags}
                            onChange={(e) =>
                              setEdit((v) => ({ ...v, tags: e.target.value }))
                            }
                            placeholder="urgent, leasing"
                          />
                        </Field>
                        <Field label="Follow-up">
                          <input
                            type="datetime-local"
                            value={edit.followUpAt}
                            onChange={(e) =>
                              setEdit((v) => ({
                                ...v,
                                followUpAt: e.target.value,
                              }))
                            }
                          />
                        </Field>
                        <Field label="Internal note">
                          <textarea
                            rows={4}
                            value={edit.internalNotes}
                            onChange={(e) =>
                              setEdit((v) => ({
                                ...v,
                                internalNotes: e.target.value,
                              }))
                            }
                          />
                        </Field>
                        <label className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={edit.automationDisabled}
                            onChange={(e) =>
                              setEdit((v) => ({
                                ...v,
                                automationDisabled: e.target.checked,
                              }))
                            }
                          />{" "}
                          Disable automation for this thread
                        </label>
                        <button
                          onClick={() => updateThread()}
                          disabled={!!busy}
                          className="mt-3 w-full rounded-lg bg-black px-3 py-2 text-xs text-white"
                        >
                          Save thread
                        </button>
                      </Side>
                      <Side title="Audit timeline">
                        {audit.filter((item) => item.entity_id === selected.id)
                          .length ? (
                          audit
                            .filter((item) => item.entity_id === selected.id)
                            .map((item) => (
                              <div
                                key={item.id}
                                className="border-l-2 border-emerald-200 pb-3 pl-3 text-xs"
                              >
                                <p>{item.action.replaceAll("_", " ")}</p>
                                <time className="text-zinc-400">
                                  {formatDate(item.created_at)}
                                </time>
                              </div>
                            ))
                        ) : (
                          <p className="text-xs text-zinc-500">
                            No thread audit events yet.
                          </p>
                        )}
                        {selectedActions.map((action) => (
                          <div
                            key={action.id}
                            className="border-l-2 border-zinc-200 pb-3 pl-3 text-xs"
                          >
                            <p>
                              {action.action.replaceAll("_", " ")} ·{" "}
                              {action.status.replaceAll("_", " ")}
                            </p>
                            <time className="text-zinc-400">
                              {formatDate(
                                action.updated_at || action.created_at,
                              )}
                            </time>
                          </div>
                        ))}
                      </Side>
                    </aside>
                  </div>
                </main>
              )}
            </section>
          )
        )}
      </div>
    </AppShell>
  );
}

function Urgency({ value }: { value: string }) {
  return (
    <span
      className={`h-fit rounded-full px-2 py-1 text-[9px] uppercase ${value === "Emergency" ? "bg-red-100 text-red-700" : ["Urgent", "High"].includes(value) ? "bg-amber-100 text-amber-800" : "bg-zinc-100 text-zinc-600"}`}
    >
      {value}
    </span>
  );
}
function Temperature({
  value,
  score,
}: {
  value: "Hot" | "Warm" | "Cold";
  score: number;
}) {
  const tone =
    value === "Hot"
      ? "bg-red-50 text-red-700"
      : value === "Warm"
        ? "bg-amber-50 text-amber-800"
        : "bg-sky-50 text-sky-800";
  return (
    <span
      className={`h-fit rounded-full px-2 py-1 text-[9px] uppercase ${tone}`}
    >
      {value} {score}
    </span>
  );
}
function Side({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-black/[.06] p-4">
      <h3 className="mb-4 text-[10px] uppercase tracking-[.2em] text-zinc-400">
        {title}
      </h3>
      {children}
    </section>
  );
}
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-3">
      <p className="text-[10px] uppercase text-zinc-400">{label}</p>
      <p className="mt-1 text-xs leading-5">{value}</p>
    </div>
  );
}
function List({ label, values }: { label: string; values: unknown[] }) {
  return (
    <Fact
      label={label}
      value={
        values?.length
          ? values
              .map((value) =>
                typeof value === "string" ? value : JSON.stringify(value),
              )
              .join(" · ")
          : "None extracted"
      }
    />
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="mb-3 block text-xs text-zinc-500">
      {label}
      <div className="mt-1 [&_input]:h-9 [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:px-2 [&_select]:h-9 [&_select]:w-full [&_select]:rounded-lg [&_select]:border [&_select]:px-2 [&_textarea]:w-full [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:p-2">
        {children}
      </div>
    </label>
  );
}
function State({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: React.ReactNode;
}) {
  return (
    <section
      role="status"
      className="liquid-card mt-5 flex flex-wrap items-center justify-between gap-6 rounded-[22px] border border-white/90 bg-white/80 p-6 shadow-[0_16px_38px_rgba(25,42,32,.07)]"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e8f5ee] text-lg text-[#12643e]">
          +
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.22em] text-emerald-700">
            Connection status
          </p>
          <h2 className="mt-2 font-semibold">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
            {detail}
          </p>
        </div>
      </div>
      {action && (
        <div className="shrink-0 [&_a]:inline-flex [&_a]:rounded-xl [&_a]:bg-black [&_a]:px-4 [&_a]:py-3 [&_a]:text-sm [&_a]:text-white [&_button]:rounded-xl [&_button]:bg-black [&_button]:px-4 [&_button]:py-3 [&_button]:text-sm [&_button]:text-white">
          {action}
        </div>
      )}
    </section>
  );
}
