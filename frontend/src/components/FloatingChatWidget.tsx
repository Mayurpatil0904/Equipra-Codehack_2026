// frontend/src/components/FloatingChatWidget.tsx
import React, { useState, useRef, useEffect } from "react";
import {
  MessageSquare,
  X,
  Send,
  Loader2,
  Users,
  Search,
  ArrowLeft,
  ShieldCheck,
  UserCircle2,
  GraduationCap,
  Sparkles,
  Minimize2,
  Maximize2,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { messagesApi, token } from "@/lib/api";
import { countWords, cn } from "@/lib/utils";
import { toast } from "sonner";

async function fetchContacts(): Promise<any[]> {
  const BASE = (import.meta as any).env?.VITE_API_URL ?? "https://equipra-codehack-2026-backend.onrender.com/api";
  const res = await fetch(`${BASE}/messages/contacts`, {
    headers: { Authorization: `Bearer ${token.get()}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? "Failed to load contacts");
  return json.data ?? json;
}

export function FloatingChatWidget() {
  const { messageThreads, fetchThreads, user } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [activePartner, setActivePartner] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  const [search, setSearch] = useState("");

  const bodyRef = useRef<HTMLDivElement>(null);

  const wordCount = countWords(draft);
  const overLimit = wordCount > 50;

  // Total unread count across all threads
  const unreadCount = messageThreads.reduce(
    (acc, t: any) => acc + (t.unreadCount || (t.unread ? 1 : 0)),
    0
  );

  useEffect(() => {
    if (isOpen) {
      fetchThreads();
      if (contacts.length === 0) {
        setLoadingContacts(true);
        fetchContacts()
          .then(setContacts)
          .catch(() => {})
          .finally(() => setLoadingContacts(false));
      }
    }
  }, [isOpen]);

  const openThread = async (partner: any) => {
    setActivePartner(partner);
    setShowContacts(false);
    setLoadingThread(true);
    try {
      const data = await messagesApi.getThread(partner.id);
      setMessages(data);
      setTimeout(() => {
        bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
      }, 80);
    } catch {
      toast.error("Failed to load messages");
    } finally {
      setLoadingThread(false);
    }
  };

  const handleSend = async () => {
    if (!draft.trim() || overLimit || !activePartner || sending) return;
    setSending(true);
    const text = draft.trim();
    setDraft("");
    try {
      const sent = await messagesApi.send({
        receiverId: activePartner.id,
        content: text,
      });
      setMessages((prev) => [...prev, sent]);
      fetchThreads();
      setTimeout(() => {
        bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
      }, 50);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to send message");
      setDraft(text);
    } finally {
      setSending(false);
    }
  };

  const filteredThreads = messageThreads.filter((t: any) =>
    (t.participantName || "").toLowerCase().includes(search.toLowerCase())
  );

  const filteredContacts = contacts.filter(
    (c: any) =>
      c.id !== user?.id &&
      ((c.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (c.enrollmentId || "").toLowerCase().includes(search.toLowerCase()) ||
        (c.department || "").toLowerCase().includes(search.toLowerCase()))
  );

  if (!user) return null;

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-[200] flex items-center gap-2 px-4 py-3 rounded-full bg-primary text-primary-foreground shadow-2xl hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all group"
          title="Direct Messages"
        >
          <div className="relative">
            <MessageSquare className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 rounded-full bg-rose-500 text-white text-[9px] font-extrabold flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </div>
          <span className="text-xs font-bold tracking-wide">Messages</span>
        </button>
      )}

      {/* Floating Chat Modal */}
      {isOpen && (
        <div className="fixed bottom-6 right-4 sm:right-6 z-[250] w-[calc(100vw-2rem)] sm:w-[400px] h-[520px] max-h-[85vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="bg-muted/60 border-b border-border px-4 py-3 flex items-center justify-between">
            {activePartner ? (
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  onClick={() => setActivePartner(null)}
                  className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-foreground truncate">{activePartner.name}</h4>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {activePartner.role} • {activePartner.department || "Campus"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                <h3 className="font-bold text-xs font-display text-foreground">Direct Messages</h3>
              </div>
            )}

            <div className="flex items-center gap-1">
              {!activePartner && (
                <button
                  onClick={() => setShowContacts(!showContacts)}
                  className={cn(
                    "p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors",
                    showContacts
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                  title="New Conversation"
                >
                  <Users className="h-3.5 w-3.5" />
                  <span className="text-[11px]">{showContacts ? "Threads" : "New Chat"}</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Active Conversation View */}
          {activePartner ? (
            <div className="flex-1 flex flex-col min-h-0 bg-background/50">
              {/* Messages stream */}
              <div ref={bodyRef} className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs">
                {loadingThread ? (
                  <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span>Loading chat…</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground text-xs">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>No messages yet. Send a greeting!</p>
                  </div>
                ) : (
                  messages.map((m: any) => {
                    const isMe = m.senderId === user.id;
                    return (
                      <div
                        key={m.id}
                        className={cn("flex flex-col", isMe ? "items-end" : "items-start")}
                      >
                        <div
                          className={cn(
                            "max-w-[80%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed",
                            isMe
                              ? "bg-primary text-primary-foreground rounded-br-xs"
                              : "bg-muted text-foreground border border-border/60 rounded-bl-xs"
                          )}
                        >
                          {m.content}
                        </div>
                        <span className="text-[9px] text-muted-foreground mt-0.5 px-1">
                          {new Date(m.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Chat Input */}
              <div className="p-2.5 bg-card border-t border-border space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="Type a message (max 50 words)…"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!draft.trim() || overLimit || sending}
                    className="p-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shrink-0"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
                <div className="flex justify-between items-center px-1 text-[10px] text-muted-foreground">
                  <span className={cn(overLimit && "text-rose-500 font-bold")}>
                    {wordCount}/50 words
                  </span>
                  <span>Press Enter to send</span>
                </div>
              </div>
            </div>
          ) : (
            /* Threads / Contacts List View */
            <div className="flex-1 flex flex-col min-h-0">
              {/* Search Bar */}
              <div className="p-2.5 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder={showContacts ? "Search contacts…" : "Search conversations…"}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto divide-y divide-border/60">
                {showContacts ? (
                  /* Contacts list */
                  loadingContacts ? (
                    <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-xs">Loading campus directory…</span>
                    </div>
                  ) : filteredContacts.length === 0 ? (
                    <div className="text-center py-16 text-xs text-muted-foreground">
                      No contacts found
                    </div>
                  ) : (
                    filteredContacts.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => openThread(c)}
                        className="w-full p-3 flex items-center justify-between hover:bg-muted/40 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                            {c.name ? c.name[0] : "U"}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">{c.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {c.role} • {c.department}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-primary px-2 py-0.5 rounded bg-primary/10 shrink-0">
                          Chat
                        </span>
                      </button>
                    ))
                  )
                ) : /* Existing Threads list */
                filteredThreads.length === 0 ? (
                  <div className="text-center py-16 text-xs text-muted-foreground space-y-2 p-4">
                    <MessageSquare className="h-8 w-8 mx-auto opacity-30" />
                    <p>No active conversations</p>
                    <button
                      onClick={() => setShowContacts(true)}
                      className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-bold text-xs hover:bg-primary/20 transition-colors"
                    >
                      Start a Conversation
                    </button>
                  </div>
                ) : (
                  filteredThreads.map((t: any) => (
                    <button
                      key={t.id}
                      onClick={() =>
                        openThread({
                          id: t.id,
                          name: t.participantName,
                          role: t.participantRole,
                          department: t.participantDepartment,
                        })
                      }
                      className="w-full p-3 flex items-start justify-between hover:bg-muted/40 transition-colors text-left"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                          {t.participantName ? t.participantName[0] : "U"}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-foreground truncate">
                              {t.participantName}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                              {t.participantRole}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                            {t.lastMessage || "No messages"}
                          </p>
                        </div>
                      </div>
                      {t.lastMessageAt && (
                        <span className="text-[9px] text-muted-foreground shrink-0 ml-2">
                          {new Date(t.lastMessageAt).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
