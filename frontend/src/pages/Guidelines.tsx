import {
  GraduationCap, ClipboardCheck, HandHeart, Search,
  Building2, CheckCircle2, Users, Calendar, MessageSquare, Lock,
} from "lucide-react";

const guidelines = [
  { icon: GraduationCap,   title: "Academic Use Only",          desc: "All hardware is provided exclusively for academic projects, coursework, research, and learning purposes within the department." },
  { icon: ClipboardCheck,  title: "Approval Workflow Required",  desc: "Requests route: Student → Faculty Professor → Lab Assistant → Final Approval. Each stage has 24 hours to process." },
  { icon: Calendar,        title: "14-Day Maximum Period",       desc: "Equipment may be borrowed for up to 14 days. Extensions must be requested 2 days before due date, subject to availability." },
  { icon: HandHeart,       title: "Handle Responsibly",         desc: "Use anti-static protection for sensitive components. Do not expose equipment to extreme temperatures, moisture, or physical shock." },
  { icon: Search,          title: "Condition Verification",     desc: "Pre-issue and post-return fault scans create transparent records protecting both students and the department." },
  { icon: Building2,       title: "University Ownership",       desc: "All hardware remains university property. The department retains full control over lending policies and decisions." },
  { icon: Users,           title: "Team Projects",              desc: "Professors create teams via Excel upload. Members use the unique Team ID for requests. Individual IDs are locked while active." },
  { icon: MessageSquare,   title: "50-Word Message Limit",      desc: "All messages to lab assistants are capped at 50 words for clarity and conciseness. Keep communications professional." },
  { icon: Lock,            title: "Team Lock Policy",           desc: "Once you are added to an active team, individual equipment issuance is locked until the professor marks the project completed." },
];

const bestPractices = [
  "Return hardware by the agreed due date",
  "Report any issues immediately to lab staff",
  "Keep hardware in its designated case/packaging",
  "Do not modify or open sealed components",
  "Clean equipment before return if applicable",
  "Ensure all accessories are returned together",
  "Submit requests at least 48 hours in advance",
  "Use your Team ID for all team project requests",
];

export default function Guidelines() {
  return (
    <>
      <section className="bg-muted/30 border-b border-border py-12">
        <div className="container">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">Usage Guidelines</h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            These guidelines ensure fair access and proper care of department hardware.
            Following them helps maintain equipment availability for all users.
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {guidelines.map((item, i) => (
              <div
                key={item.title}
                className="bg-card border border-border rounded-xl p-6 animate-fade-in"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 bg-muted/30 border-y border-border">
        <div className="container max-w-2xl">
          <h2 className="font-display text-xl font-bold text-foreground mb-6 text-center">Best Practices</h2>
          <div className="bg-card border border-border rounded-xl p-6">
            <ul className="space-y-3">
              {bestPractices.map(p => (
                <li key={p} className="flex items-start gap-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-status-available flex-shrink-0 mt-0.5" />
                  <span className="text-foreground">{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container max-w-2xl text-center">
          <h2 className="font-display text-xl font-bold text-foreground mb-3">Need Assistance?</h2>
          <p className="text-muted-foreground">
            For questions about hardware access or guidance on specific equipment,
            contact your lab supervisor or visit the department office during working hours.
            You can also use the <strong>Feedback</strong> button to submit suggestions.
          </p>
        </div>
      </section>
    </>
  );
}
