// src/lib/anthropic.ts
// Drop-in replacement for gemini.ts — uses Anthropic Claude API
import Anthropic from "@anthropic-ai/sdk";

const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const MODEL = "claude-sonnet-4-20250514";

export function isConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

async function chat(prompt: string): Promise<string> {
  if (!client) throw new Error("ANTHROPIC_API_KEY not configured");
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });
  // Extract text from response
  const block = message.content[0];
  if (block.type === "text") return block.text.trim();
  throw new Error("Unexpected response type from Claude");
}

export interface DiscoveredCompetition {
  name: string;
  organizer: string;
  deadline: string;
  description: string;
  website: string;
  regLink: string;
  category: string;
  eligibility: string;
  prize: string;
  location: string;
}

// ── Fallback curated competitions ─────────────────────────────
function getFallbackCompetitions(): DiscoveredCompetition[] {
  const year = new Date().getFullYear();
  return [
    { name: `Smart India Hackathon ${year}`, organizer: "AICTE & MoE, Govt. of India", deadline: "", description: "India's largest open innovation hackathon. Students solve real-world problems posed by government and industry.", website: "https://sih.gov.in", regLink: "https://sih.gov.in", category: "hackathon", eligibility: "all", prize: "₹1,00,000 per problem", location: "Nationwide" },
    { name: "Google Summer of Code", organizer: "Google", deadline: "", description: "Global program pairing student developers with open source organizations for paid summer internships.", website: "https://summerofcode.withgoogle.com", regLink: "https://summerofcode.withgoogle.com", category: "program", eligibility: "all", prize: "Stipend $1500-$6600", location: "Online" },
    { name: "HackWithInfy", organizer: "Infosys", deadline: "", description: "National level coding competition for engineering students with chance to win pre-placement offers at Infosys.", website: "https://www.infosys.com/careers/hackwithinfy.html", regLink: "https://www.infosys.com/careers/hackwithinfy.html", category: "hackathon", eligibility: "undergrad", prize: "PPO + Cash prizes", location: "Online" },
    { name: "TCS CodeVita", organizer: "Tata Consultancy Services", deadline: "", description: "Global coding contest open to students. One of the world's largest programming competitions.", website: "https://www.tcscodevita.com", regLink: "https://www.tcscodevita.com", category: "competition", eligibility: "all", prize: "₹20,000 + Job offers", location: "Online" },
    { name: "IEEE Xtreme Programming", organizer: "IEEE", deadline: "", description: "24-hour global programming competition for IEEE student members. Teams solve algorithmic challenges.", website: "https://ieeextreme.org", regLink: "https://ieeextreme.org", category: "competition", eligibility: "all", prize: "Prizes + IEEE recognition", location: "Online" },
    { name: "MLH Global Hack Week", organizer: "Major League Hacking", deadline: "", description: "Week-long hackathon with daily challenges, workshops, and mini-events for student developers worldwide.", website: "https://ghw.mlh.io", regLink: "https://ghw.mlh.io", category: "hackathon", eligibility: "all", prize: "Swag + Certificates", location: "Online" },
    { name: "Kaggle Competitions", organizer: "Google / Kaggle", deadline: "", description: "Data science and machine learning competitions with real-world datasets. Various active competitions year-round.", website: "https://www.kaggle.com/competitions", regLink: "https://www.kaggle.com/competitions", category: "competition", eligibility: "all", prize: "Up to $100,000", location: "Online" },
    { name: "ICPC Asia Regional", organizer: "ICPC Foundation", deadline: "", description: "The International Collegiate Programming Contest. Premier algorithmic programming competition for college students.", website: "https://icpc.global", regLink: "https://icpc.global", category: "competition", eligibility: "undergrad", prize: "Medals + World Finals qualification", location: "Multiple cities" },
    { name: "e-Yantra Robotics Competition", organizer: "IIT Bombay & MoE", deadline: "", description: "National robotics competition using embedded systems. Teams solve real-world problems using robots and IoT.", website: "https://www.e-yantra.org", regLink: "https://www.e-yantra.org", category: "competition", eligibility: "undergrad", prize: "₹1,00,000 + Internship", location: "Online + IIT Bombay" },
    { name: "Microsoft Imagine Cup", organizer: "Microsoft", deadline: "", description: "Global student technology competition to develop innovative solutions using Microsoft technologies.", website: "https://imaginecup.microsoft.com", regLink: "https://imaginecup.microsoft.com", category: "competition", eligibility: "all", prize: "$100,000 + Mentorship", location: "Online" },
    { name: `KAVACH ${year}`, organizer: "MHA & AICTE", deadline: "", description: "National cybersecurity hackathon to develop innovative solutions for law enforcement and internal security.", website: "https://kavach.mic.gov.in", regLink: "https://kavach.mic.gov.in", category: "hackathon", eligibility: "all", prize: "₹1,00,000", location: "Nationwide" },
    { name: "Hacktoberfest", organizer: "DigitalOcean", deadline: `${year}-10-31`, description: "Month-long celebration of open source in October. Contribute to open source projects and earn rewards.", website: "https://hacktoberfest.com", regLink: "https://hacktoberfest.com", category: "program", eligibility: "all", prize: "Digital badges + Swag", location: "Online" },
  ];
}

export async function discoverCompetitions(): Promise<DiscoveredCompetition[]> {
  try {
    const today = new Date().toISOString().split("T")[0];

    const prompt = `You are a competition discovery assistant for engineering college students in India.

Find 10-15 REAL, currently active or upcoming technical competitions, hackathons, and events that engineering students can participate in. Focus on:
- National hackathons (SIH, HackWithInfy, etc.)
- IEEE/ACM/AICTE competitions
- Tech company hackathons (Google, Microsoft, Amazon, etc.)
- Open source programs (GSoC, MLH, etc.)
- IoT/Electronics/Embedded systems competitions
- AI/ML challenges (Kaggle, etc.)

Today's date is ${today}. Only include events with deadlines AFTER today or ongoing events.

Return ONLY a valid JSON array. Each object must have these exact fields:
{
  "name": "Competition Name",
  "organizer": "Organizing body",
  "deadline": "YYYY-MM-DD or empty string if ongoing",
  "description": "2-3 sentence description",
  "website": "https://official-website-url",
  "regLink": "https://direct-registration-link",
  "category": "hackathon|competition|expo|workshop|program",
  "eligibility": "all|undergrad|postgrad",
  "prize": "Prize amount or description",
  "location": "Online or City name"
}

IMPORTANT: Return ONLY the JSON array, no markdown, no code fences, no explanation.`;

    const text = await chat(prompt);

    let jsonStr = text;
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) throw new Error("Claude did not return an array");
    console.log("[AI] ✅ Used Claude for competition discovery");
    return parsed;
  } catch (err: any) {
    console.warn(`[AI] ⚠️ Claude failed (${err.message}), using curated fallback`);
    return getFallbackCompetitions();
  }
}

// ── Fallback local insights generator ─────────────────────────
function generateLocalInsights(labData: any): any[] {
  const insights: any[] = [];
  const eq = labData.equipment;
  const req = labData.requests;

  if (eq.utilizationRate > 70) {
    insights.push({ type: "alert", title: "High Equipment Utilization", description: `Equipment utilization is at ${eq.utilizationRate}% — only ${eq.available} of ${eq.total} items are available. Consider procuring more popular items.`, severity: "warning" });
  } else if (eq.utilizationRate < 30) {
    insights.push({ type: "trend", title: "Low Equipment Usage", description: `Only ${eq.utilizationRate}% of equipment is currently in use. Consider running awareness campaigns to boost lab engagement.`, severity: "info" });
  } else {
    insights.push({ type: "trend", title: "Healthy Equipment Utilization", description: `Equipment utilization is at ${eq.utilizationRate}% — a balanced mix of ${eq.available} available and ${eq.total - eq.available} in-use items.`, severity: "info" });
  }

  if (eq.maintenance > 0) {
    insights.push({ type: "alert", title: "Equipment Under Maintenance", description: `${eq.maintenance} equipment item(s) are currently under maintenance. Prioritize repairs to restore availability.`, severity: eq.maintenance > 3 ? "critical" : "warning" });
  }

  if (req.total > 0) {
    insights.push({ type: "trend", title: "Request Approval Rate", description: `${req.approvalRate}% of ${req.total} total requests have been approved. ${req.pending} requests are still pending review.`, severity: req.pending > 10 ? "warning" : "info" });
  }

  if (req.pending > 5) {
    insights.push({ type: "alert", title: "Pending Requests Backlog", description: `${req.pending} requests are awaiting review. Consider clearing the backlog to improve student satisfaction.`, severity: "warning" });
  }

  if (labData.topRequestedEquipment?.length > 0) {
    const top = labData.topRequestedEquipment[0];
    insights.push({ type: "optimization", title: "Most Requested Equipment", description: `"${top.name}" leads with ${top.requestCount} requests. Ensure sufficient units are available or consider adding more.`, severity: "info" });
  }

  const totalUsers = labData.users.students + labData.users.faculty;
  if (totalUsers > 0) {
    insights.push({ type: "trend", title: "User Base", description: `${labData.users.students} students and ${labData.users.faculty} faculty members are registered. ${req.total > 0 ? `Averaging ${(req.total / totalUsers).toFixed(1)} requests per user.` : ""}`, severity: "info" });
  }

  return insights;
}

export async function generateLabInsights(labData: any): Promise<string> {
  try {
    const prompt = `You are an AI lab analytics assistant for Equipra, a university equipment management platform.

Analyze this lab data and provide 4-6 actionable insights. Be specific with numbers.

Lab Data:
${JSON.stringify(labData, null, 2)}

Format your response as a JSON array of insight objects:
[
  {
    "type": "trend|alert|optimization|anomaly",
    "title": "Short title",
    "description": "1-2 sentence insight with specific numbers",
    "severity": "info|warning|critical"
  }
]

Return ONLY the JSON array, no markdown, no code fences.`;

    const text = await chat(prompt);
    console.log("[AI] ✅ Used Claude for lab insights");
    return text;
  } catch (err: any) {
    console.warn(`[AI] ⚠️ Claude failed (${err.message}), using local analysis`);
    return JSON.stringify(generateLocalInsights(labData));
  }
}
