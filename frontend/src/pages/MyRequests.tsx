import { CollectionPass } from "@/components/CollectionPass";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Calendar,
  User,
  MessageSquare,
  Loader2,
  RefreshCw,
} from "lucide-react";

import { useApp } from "@/context/AppContext";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, cn } from "@/lib/utils";

const STATUS_STEPS: Record<string, number> = {
  pending_faculty: 1,
  pending_lab: 2,
  approved: 3,
  rejected: 3,
  issued: 4,
  returned: 4,
};

function WorkflowBar({
  status,
}: {
  status: string;
}) {
  const step = STATUS_STEPS[status] ?? 0;

  const rejected =
    status === "rejected";

  const labels = [
    "Submitted",
    "Faculty",
    "Lab Asst.",
    "Decision",
  ];

  return (
    <div className="flex items-center gap-0 mt-4">
      {labels.map((label, i) => (
        <div
          key={label}
          className="flex items-center gap-0 flex-1 last:flex-none"
        >
          <div className="flex flex-col items-center gap-1">
            <div
              className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors duration-200 flex-shrink-0",

                i < step && !rejected
                  ? "bg-status-available text-white"
                  : i === step - 1 &&
                    rejected
                  ? "bg-status-fault text-white"
                  : i < step
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted border border-border text-muted-foreground"
              )}
            >
              {i < step && !rejected
                ? "✓"
                : i === step - 1 &&
                  rejected
                ? "✗"
                : i + 1}
            </div>

            <span className="text-[9px] text-muted-foreground whitespace-nowrap hidden sm:block">
              {label}
            </span>
          </div>

          {i < labels.length - 1 && (
            <div
              className={cn(
                "flex-1 h-0.5 mx-0.5 mb-4 sm:mb-0",

                i < step - 1
                  ? "bg-status-available"
                  : "bg-border"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function MyRequests() {
  const {
    requests,
    requestsLoading,
    fetchRequests,
    user,
  } = useApp();

  const mine = requests.filter(
    (r) => r.studentId === user?.id
  );

  useEffect(() => {
    fetchRequests();
  }, []);

  if (requestsLoading)
    return (
      <div className="container py-20 flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading your requests…
      </div>
    );

  return (
    <>
      <section className="bg-muted/30 border-b border-border py-10">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <div className="container flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground mb-1">
                My Requests
              </h1>

              <p className="text-muted-foreground">
                Track your equipment requests
                through the approval workflow.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={fetchRequests}
                className="flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </button>

              <Link
                to="/request"
                className="bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors duration-200"
              >
                + New Request
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      <div className="container py-8 max-w-3xl space-y-4">
        {mine.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">
              📋
            </div>

            <h2 className="font-display text-2xl font-bold mb-2">
              No requests yet
            </h2>

            <p className="text-muted-foreground mb-6">
              You haven't submitted any
              equipment requests.
            </p>

            <Link
              to="/request"
              className="inline-flex bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors duration-200"
            >
              Submit Your First Request →
            </Link>
          </div>
        ) : (
          mine.map((req) => (
            <div
              key={req.id}
              className="bg-card border border-border rounded-xl p-5 hover:border-border/80 transition-colors duration-200"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h3 className="font-semibold text-foreground">
                    {req.itemName}
                  </h3>

                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground font-mono flex-wrap">
                    <span>{String(req.id).slice(0, 8)}…</span>

                    {req.isPriorityPassUsed && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                        ⚡ Urgent Fast-Track ({req.pointsBurned || 15} pts burned)
                      </span>
                    )}

                    {req.type === "team" && (
                      <span className="team-id-badge text-[10px] py-0.5 px-2">
                        {req.teamId}
                      </span>
                    )}
                  </div>
                </div>

                <StatusBadge
                  type="request"
                  status={req.status}
                />
              </div>

              <p className="text-sm text-muted-foreground mb-1">
                <span className="font-medium text-foreground">
                  Project:
                </span>{" "}
                {req.project}
              </p>

              <p className="text-sm text-muted-foreground mb-3">
                <span className="font-medium text-foreground">
                  Purpose:
                </span>{" "}
                {req.purpose}
              </p>

              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground border-t border-border pt-3">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />

                  <span>
                    {formatDate(
                      req.dateFrom
                    )}{" "}
                    →{" "}
                    {formatDate(
                      req.dateTo
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />

                  <span>
                    {req.professorName}
                  </span>
                </div>

                {req.messages.length >
                  0 && (
                  <div className="flex items-center gap-1.5 text-primary font-medium">
                    <MessageSquare className="h-3.5 w-3.5" />

                    <span>
                      {
                        req.messages
                          .length
                      }{" "}
                      message
                      {req.messages
                        .length > 1
                        ? "s"
                        : ""}
                    </span>
                  </div>
                )}
              </div>

              <WorkflowBar
                status={req.status}
              />

              {/* Latest message */}
              {req.messages.length >
                0 && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Latest from{" "}
                    {req.messages[
                      req.messages
                        .length - 1
                    ].senderName ??
                      "Lab Assistant"}
                  </p>

                  <p className="text-sm text-foreground">
                    {
                      req.messages[
                        req.messages
                          .length - 1
                      ].text
                    }
                  </p>

                  <p className="text-xs text-muted-foreground mt-1 font-mono">
                    {
                      req.messages[
                        req.messages
                          .length - 1
                      ].time
                    }
                  </p>
                </div>
              )}

              <CollectionPass
                request={req}
              />
            </div>
          ))
        )}
      </div>
    </>
  );
}