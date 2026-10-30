// frontend/src/pages/Messages.tsx
// FIX: Added contacts panel so students/faculty/admin can START conversations
// Previously only showed existing threads — if no threads existed, nothing to click
// Now shows all messageable users from same college with a + button

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send, MessageSquare, Loader2, Plus, Search, X,
  ShieldCheck, UserCircle2, GraduationCap, ArrowLeft,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { messagesApi } from "@/lib/api";
import { countWords, cn } from "@/lib/utils";
import { toast } from "sonner";
import { token } from "@/lib/api";

// Fetch contacts from backend
async function fetchContacts(): Promise<any[]> {
  const BASE = (import.meta as any).env?.VITE_API_URL ?? "https://equipra-codehack-2026-backend.onrender.com/api";
  const res  = await fetch(`${BASE}/messages/contacts`, {
    headers: { Authorization: `Bearer ${token.get()}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? "Failed to load contacts");
  return json.data ?? json;
}

function roleLabel(role: string) {
  if (role === "ADMIN")   return "Lab Admin";
  if (role === "FACULTY") return "Faculty";
  return "Student";
}

function RoleIcon({ role, size = "h-4 w-4" }: { role: string; size?: string }) {
  if (role === "ADMIN")   return <ShieldCheck   className={cn(size)} />;
  if (role === "FACULTY") return <UserCircle2   className={cn(size)} />;
  return                         <GraduationCap className={cn(size)} />;
}

function avatarBg(role: string) {
  if (role === "ADMIN")   return "bg-primary/15 text-primary";
  if (role === "FACULTY") return "bg-accent/15 text-accent";
  return "bg-muted text-muted-foreground";
}

export default function Messages() {
  const { messageThreads, fetchThreads, user } = useApp();

  const [activePartnerId, setActivePartnerId] = useState("");
  const [partner,         setPartner]         = useState<any>(null);
  const [fullThread,      setFullThread]      = useState<any[]>([]);
  const [draft,           setDraft]           = useState("");
  const [sending,         setSending]         = useState(false);
  const [loadingThread,   setLoadingThread]   = useState(false);
  const [mobileShowChat,  setMobileShowChat]  = useState(false);

  // Contacts
  const [contacts,        setContacts]        = useState<any[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [showContacts,    setShowContacts]    = useState(false);
  const [contactSearch,   setContactSearch]   = useState("");
  const [threadSearch,    setThreadSearch]    = useState("");

  const bodyRef   = useRef<HTMLDivElement>(null);
  const wordCount = countWords(draft);
  const overLimit = wordCount > 50;

  // Load contacts once on mount
  useEffect(() => {
    fetchContacts()
      .then(setContacts)
      .catch(() => {})
      .finally(() => setLoadingContacts(false));
  }, []);

  // Open first thread automatically if exists
  useEffect(() => {
    if (!activePartnerId && messageThreads.length > 0) {
      const first = messageThreads[0];
      openThread(first.id, first.participantName, first.participantRole);
    }
  }, [messageThreads]);

  // Auto scroll to bottom
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [fullThread.length]);

  const openThread = useCallback(async (
    partnerId: string,
    partnerName?: string,
    partnerRole?: string,
  ) => {
    setActivePartnerId(partnerId);
    setPartner({ id: partnerId, name: partnerName ?? "...", role: partnerRole ?? "ADMIN" });
    setShowContacts(false);
    setMobileShowChat(true);
    setLoadingThread(true);
    try {
      const data = await messagesApi.getThread(partnerId);
      setFullThread(data.messages ?? []);
      if (data.partner) setPartner(data.partner);
    } catch {
      setFullThread([]);
    } finally {
      setLoadingThread(false);
    }
  }, []);

  const sendMsg = async () => {
    if (!draft.trim() || overLimit || sending || !activePartnerId) return;
    setSending(true);
    try {
      await messagesApi.send(activePartnerId, draft.trim());
      setDraft("");
      const data = await messagesApi.getThread(activePartnerId);
      setFullThread(data.messages ?? []);
      await fetchThreads();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to send.");
    } finally {
      setSending(false);
    }
  };

  const filteredThreads  = messageThreads.filter(t =>
    (t.participantName ?? "").toLowerCase().includes(threadSearch.toLowerCase())
  );
  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
    (c.department ?? "").toLowerCase().includes(contactSearch.toLowerCase())
  );

  return (
    <>
      <section className="bg-muted/30 border-b border-border py-10">
        <div className="container">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">Messages</h1>
          <p className="text-muted-foreground">
            Communicate with lab admins and faculty. Messages are limited to <strong>50 words</strong>.
          </p>
        </div>
      </section>

      <div className="container py-6">
        <div
          className="bg-card border border-border rounded-xl overflow-hidden flex"
          style={{ height: "calc(100vh - 280px)", minHeight: "520px" }}
        >

          {/* ── LEFT SIDEBAR ──────────────────────────────────── */}
          <div className={cn(
            "w-full md:w-72 flex-shrink-0 border-r border-border flex flex-col",
            mobileShowChat ? "hidden md:flex" : "flex"
          )}>

            {/* Header */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <p className="font-semibold text-sm text-foreground">Conversations</p>
              <button
                onClick={() => { setShowContacts(!showContacts); setContactSearch(""); }}
                title={showContacts ? "Close" : "New conversation"}
                className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors duration-200"
              >
                {showContacts ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              </button>
            </div>

            {/* ── NEW CONVERSATION CONTACTS ─────────────────── */}
            {showContacts && (
              <div className="border-b border-border">
                <div className="px-3 pt-3 pb-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Start new conversation
                  </p>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search contacts..."
                      value={contactSearch}
                      onChange={e => setContactSearch(e.target.value)}
                      className="w-full pl-7 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/40"
                    />
                  </div>
                </div>
                <div className="max-h-56 overflow-y-auto px-2 pb-2">
                  {loadingContacts ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredContacts.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">
                      No contacts found
                    </p>
                  ) : (
                    filteredContacts.map(c => (
                      <button
                        key={c.id}
                        onClick={() => openThread(c.id, c.name, c.role)}
                        className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-muted/60 transition-colors duration-200 flex items-center gap-2.5 mb-0.5"
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                          avatarBg(c.role)
                        )}>
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-foreground truncate">{c.name}</p>
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <RoleIcon role={c.role} size="h-3 w-3" />
                            {roleLabel(c.role)} · {c.department}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ── THREADS SEARCH ────────────────────────────── */}
            {!showContacts && messageThreads.length > 3 && (
              <div className="px-3 py-2 border-b border-border/50">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={threadSearch}
                    onChange={e => setThreadSearch(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* ── THREAD LIST ───────────────────────────────── */}
            <div className="flex-1 overflow-y-auto">
              {filteredThreads.length === 0 && !showContacts && (
                <div className="p-6 text-center">
                  <MessageSquare className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground mb-2">No conversations yet.</p>
                  <button
                    onClick={() => setShowContacts(true)}
                    className="text-xs text-primary font-medium hover:underline"
                  >
                    Start one →
                  </button>
                </div>
              )}
              {filteredThreads.map(t => (
                <button
                  key={t.id}
                  onClick={() => openThread(t.id, t.participantName, t.participantRole)}
                  className={cn(
                    "w-full text-left px-4 py-3.5 border-b border-border/60 hover:bg-muted/50 transition-colors duration-200",
                    activePartnerId === t.id && "bg-primary/8 border-l-2 border-l-primary"
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5",
                      avatarBg(t.participantRole ?? "ADMIN")
                    )}>
                      {(t.participantName ?? "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {t.participantName}
                        </p>
                        {(t.unreadCount ?? 0) > 0 && (
                          <span className="ml-1 bg-primary text-primary-foreground text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0">
                            {t.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {t.messages?.at(-1)?.text ?? "No messages yet"}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ── RIGHT — CONVERSATION ──────────────────────────── */}
          {activePartnerId && partner ? (
            <div className={cn("flex-1 flex flex-col min-w-0", mobileShowChat ? "flex" : "hidden md:flex")}>

              {/* Conversation header */}
              <div className="px-5 py-3.5 border-b border-border flex items-center gap-3 bg-card/50">
                <button
                  onClick={() => setMobileShowChat(false)}
                  className="md:hidden flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground mr-1"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <div className={cn(
                  "h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0",
                  avatarBg(partner.role ?? "ADMIN")
                )}>
                  {(partner.name ?? "?").charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{partner.name}</p>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <RoleIcon role={partner.role ?? "ADMIN"} size="h-3 w-3" />
                    {roleLabel(partner.role ?? "ADMIN")}
                    {partner.department && ` · ${partner.department}`}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div ref={bodyRef} className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
                {loadingThread && (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
                  </div>
                )}
                {!loadingThread && fullThread.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                    <MessageSquare className="h-8 w-8 opacity-30" />
                    <p className="text-sm">No messages yet. Say hello!</p>
                  </div>
                )}
                {!loadingThread && fullThread.map((m: any, i: number) => {
                  const isMe = m.senderId === user?.id;
                  return (
                    <div key={i} className={cn(
                      "flex flex-col max-w-[75%]",
                      isMe ? "items-end self-end" : "items-start self-start"
                    )}>
                      <div className={cn(
                        "px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm",
                        isMe
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted text-foreground rounded-bl-sm"
                      )}>
                        {m.text}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1 font-mono px-1">
                        {new Date(m.createdAt).toLocaleTimeString("en-IN", {
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Word count */}
              <div className={cn(
                "text-right text-xs px-5 pb-1 font-mono transition-colors duration-200",
                overLimit ? "text-status-fault" : "text-muted-foreground"
              )}>
                {wordCount > 0 && `${wordCount} / 50 words`}
                {overLimit && " — over limit"}
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t border-border flex gap-2 items-end">
                <textarea
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMsg();
                    }
                  }}
                  placeholder="Type a message (max 50 words)..."
                  rows={2}
                  className={cn(
                    "flex-1 resize-none rounded-xl border px-3.5 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors duration-200",
                    overLimit ? "border-status-fault/60" : "border-border"
                  )}
                />
                <button
                  onClick={sendMsg}
                  disabled={!draft.trim() || overLimit || sending}
                  className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200 flex-shrink-0"
                >
                  {sending
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Send    className="h-4 w-4" />
                  }
                </button>
              </div>
            </div>
          ) : (
            <div className={cn("flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3", mobileShowChat ? "flex" : "hidden md:flex")}>
              <MessageSquare className="h-10 w-10 opacity-30" />
              <p className="text-sm">Select a conversation or start a new one</p>
              <button
                onClick={() => setShowContacts(true)}
                className="flex items-center gap-1.5 text-sm text-primary font-medium hover:underline"
              >
                <Plus className="h-4 w-4" /> New conversation
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
