// src/lib/email.ts
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = process.env.EMAIL_FROM ?? "Equipra <onboarding@resend.dev>";

// ── Generic send ──────────────────────────────────────────────
async function sendMail(to: string, subject: string, html: string) {
  if (!resend) {
    console.log(`[EMAIL] Skipped (no RESEND_API_KEY) To: ${to} | Subject: ${subject}`);
    return;
  }
  try {
    const { error } = await resend.emails.send({ from: FROM, to, subject, html });
    if (error) {
      console.error(`[EMAIL] ❌ Failed to send to ${to} | ${subject} | Error: ${error.message}`);
    } else {
      console.log(`[EMAIL] ✅ Sent to ${to} | ${subject}`);
    }
  } catch (err: any) {
    console.error(`[EMAIL] ❌ Failed to send to ${to} | ${subject} | Error: ${err.message}`);
  }
}

// ── Branded wrapper ───────────────────────────────────────────
function wrap(title: string, body: string): string {
  return `
  <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#f4f2ee;padding:32px">
    <div style="background:#1a3d72;border-radius:12px 12px 0 0;padding:24px 28px">
      <h1 style="color:#fff;margin:0;font-size:22px">⚙️ Equipra</h1>
      <p style="color:rgba(255,255,255,.7);margin:4px 0 0;font-size:13px">Academic Platform for Laboratory Resources</p>
    </div>
    <div style="background:#fff;padding:28px;border-radius:0 0 12px 12px;border:1px solid #d8d3cb;border-top:none">
      <h2 style="color:#1a1714;font-size:18px;margin-top:0">${title}</h2>
      ${body}
      <hr style="border:none;border-top:1px solid #ede9e3;margin:24px 0"/>
      <p style="color:#8a8077;font-size:12px;margin:0">
        This is an automated message from Equipra. Do not reply to this email.
      </p>
    </div>
  </div>`;
}

// ── Email templates ───────────────────────────────────────────

export async function emailRequestSubmitted(opts: {
  studentEmail: string; studentName: string;
  requestCode: string; itemName: string; professorName: string;
}) {
  await sendMail(
    opts.studentEmail,
    `Request ${opts.requestCode} submitted — Equipra`,
    wrap("Request Submitted Successfully", `
      <p style="color:#5a5349">Hi <strong>${opts.studentName}</strong>,</p>
      <p style="color:#5a5349">
        Your request <strong>${opts.requestCode}</strong> for
        <strong>${opts.itemName}</strong> has been submitted and forwarded to
        <strong>${opts.professorName}</strong> for verification.
      </p>
      <div style="background:#e8eef8;border-radius:8px;padding:14px;margin:16px 0;font-size:13px;color:#2d5fa6">
        <strong>Next step:</strong> Faculty review (within 24 hours)
      </div>
      <p style="color:#8a8077;font-size:13px">You will be notified at each stage of the approval process.</p>
    `)
  );
}

export async function emailFacultyNewRequest(opts: {
  facultyEmail: string; facultyName: string;
  studentName: string; requestCode: string; itemName: string; project: string;
}) {
  await sendMail(
    opts.facultyEmail,
    `New equipment request from ${opts.studentName} — Equipra`,
    wrap("New Equipment Request Awaiting Your Approval", `
      <p style="color:#5a5349">Hi <strong>${opts.facultyName}</strong>,</p>
      <p style="color:#5a5349">
        <strong>${opts.studentName}</strong> has submitted request
        <strong>${opts.requestCode}</strong> for <strong>${opts.itemName}</strong>
        for the project: <em>${opts.project}</em>.
      </p>
      <p style="color:#5a5349">Please log in to Equipra to review and verify this request.</p>
    `)
  );
}

export async function emailFacultyDecision(opts: {
  studentEmail: string; studentName: string;
  requestCode: string; itemName: string;
  approved: boolean; facultyName: string;
}) {
  const status  = opts.approved ? "Approved by Faculty ✅" : "Rejected by Faculty ❌";
  const message = opts.approved
    ? `Your request has been verified by <strong>${opts.facultyName}</strong> and forwarded to the lab assistant for final approval.`
    : `Your request has been rejected by <strong>${opts.facultyName}</strong>. Please contact your professor for further guidance.`;

  await sendMail(
    opts.studentEmail,
    `Request ${opts.requestCode} — ${status} — Equipra`,
    wrap(`Request ${status}`, `
      <p style="color:#5a5349">Hi <strong>${opts.studentName}</strong>,</p>
      <p style="color:#5a5349">${message}</p>
    `)
  );
}

export async function emailLabNewRequest(opts: {
  labEmail: string; studentName: string;
  requestCode: string; itemName: string; project: string;
  dateFrom: string; dateTo: string;
}) {
  await sendMail(
    opts.labEmail,
    `Request ${opts.requestCode} forwarded to lab — Equipra`,
    wrap("Equipment Request Awaiting Lab Approval", `
      <p style="color:#5a5349">A request has been verified by faculty and needs your final approval.</p>
      <table style="width:100%;font-size:13px;border-collapse:collapse">
        <tr><td style="padding:6px 0;color:#8a8077">Request Code</td><td style="font-weight:600">${opts.requestCode}</td></tr>
        <tr><td style="padding:6px 0;color:#8a8077">Student</td><td>${opts.studentName}</td></tr>
        <tr><td style="padding:6px 0;color:#8a8077">Equipment</td><td>${opts.itemName}</td></tr>
        <tr><td style="padding:6px 0;color:#8a8077">Project</td><td>${opts.project}</td></tr>
        <tr><td style="padding:6px 0;color:#8a8077">Dates</td><td>${opts.dateFrom} → ${opts.dateTo}</td></tr>
      </table>
    `)
  );
}

export async function emailLabDecision(opts: {
  studentEmail: string; studentName: string;
  requestCode: string; itemName: string;
  approved: boolean; message: string;
}) {
  const status = opts.approved ? "Approved ✅" : "Rejected ❌";
  await sendMail(
    opts.studentEmail,
    `Request ${opts.requestCode} — Final ${status} — Equipra`,
    wrap(`Request ${status} by Lab Assistant`, `
      <p style="color:#5a5349">Hi <strong>${opts.studentName}</strong>,</p>
      <p style="color:#5a5349">Your request for <strong>${opts.itemName}</strong> has been <strong>${opts.approved ? "approved" : "rejected"}</strong>.</p>
      <div style="background:#f9f7f4;border-left:4px solid ${opts.approved ? "#1a7a4a" : "#b83232"};padding:14px 16px;border-radius:0 8px 8px 0;font-size:14px;color:#1a1714;margin:16px 0">
        "${opts.message}"
      </div>
    `)
  );
}

export async function emailTeamCreated(opts: {
  memberEmail: string; memberName: string;
  teamCode: string; teamName: string; project: string; professorName: string;
}) {
  await sendMail(
    opts.memberEmail,
    `You've been added to team ${opts.teamCode} — Equipra`,
    wrap("You've Been Added to a Team Project", `
      <p style="color:#5a5349">Hi <strong>${opts.memberName}</strong>,</p>
      <p style="color:#5a5349">
        <strong>${opts.professorName}</strong> has added you to team
        <strong>${opts.teamName}</strong> for the project: <em>${opts.project}</em>.
      </p>
      <div style="background:#e8eef8;border-radius:8px;padding:14px;margin:16px 0">
        <p style="margin:0;font-size:13px;color:#1a1714">
          Your Team ID: <strong style="font-family:monospace;font-size:16px;color:#2d5fa6">${opts.teamCode}</strong>
        </p>
        <p style="margin:8px 0 0;font-size:12px;color:#5a5349">
          Use this ID when submitting equipment requests for this project.
          Your individual ID is locked while this team project is active.
        </p>
      </div>
    `)
  );
}

export async function emailReturnProcessed(opts: {
  studentEmail: string; studentName: string;
  requestCode: string; itemName: string;
  conditionRating: number; damageNotes?: string;
}) {
  const conditionLabels: Record<number, string> = {
    5: "Excellent ✅", 4: "Good ✅", 3: "Fair — Pending Inspection ⚠️",
    2: "Damaged ❌", 1: "Faulty ❌",
  };
  const label = conditionLabels[opts.conditionRating] ?? "Unknown";
  const color = opts.conditionRating >= 4 ? "#1a7a4a" : opts.conditionRating === 3 ? "#b8860b" : "#b83232";

  await sendMail(
    opts.studentEmail,
    `Return processed — ${opts.requestCode} — Equipra`,
    wrap("Equipment Return Processed", `
      <p style="color:#5a5349">Hi <strong>${opts.studentName}</strong>,</p>
      <p style="color:#5a5349">
        Your return of <strong>${opts.itemName}</strong> (request <strong>${opts.requestCode}</strong>) has been processed.
      </p>
      <div style="background:#f9f7f4;border-left:4px solid ${color};padding:14px 16px;border-radius:0 8px 8px 0;margin:16px 0">
        <p style="margin:0;font-size:14px;color:#1a1714">
          Condition: <strong style="color:${color}">${label}</strong>
        </p>
        ${opts.damageNotes ? `<p style="margin:8px 0 0;font-size:13px;color:#5a5349">Notes: ${opts.damageNotes}</p>` : ""}
      </div>
      ${opts.conditionRating >= 4
        ? `<p style="color:#5a5349;font-size:13px">The equipment is entering a 24-hour inspection hold before becoming available again. Thank you for taking good care of it!</p>`
        : opts.conditionRating === 3
        ? `<p style="color:#5a5349;font-size:13px">The equipment requires a manual inspection. You may be contacted if further details are needed.</p>`
        : `<p style="color:#5a5349;font-size:13px">The equipment has been flagged for maintenance. If you have questions, please contact the lab assistant.</p>`
      }
    `)
  );
}

