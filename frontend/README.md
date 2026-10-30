# Equipra — Academic Platform for Laboratory Resources

A full-featured React + TypeScript + Tailwind CSS platform for managing laboratory equipment access in universities.

---
## Live Demo
https://equipra-app.vercel.app/login

## Test Credentials
> On the login page, select **Parul University** from the dropdown.

| Role | Enrollment ID | Password |
|------|--------------|----------|
| Student | PU-STU-001 | student123 |
| Faculty | PU-FAC-001 | faculty123 |
| Admin | Admin123 | Admin123@ |

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start dev server
npm run dev

# 3. Open in browser
# http://localhost:5173
```

## 🔐 Demo Login Credentials

| Role         | ID            | Password      |
|--------------|---------------|---------------|
| **Student**  | PU-STU-001    | student123    |
| **Faculty**  | PU-FAC-001    | faculty123    |
| **Admin/Lab**| PU-ADM-001    | admin123      |

Select **Parul University** (or any college) from the dropdown.

---

## 🗂️ Project Structure

```
src/
├── styles/
│   └── globals.css          # Design tokens (light + dark), Tailwind base
├── types/
│   └── index.ts             # All shared TypeScript types
├── data/
│   └── hardwareData.ts      # Hardware inventory + professors list
├── context/
│   └── AppContext.tsx        # Global state — auth, requests, teams, feedback, messages
├── lib/
│   └── utils.ts             # cn(), formatDate(), countWords(), etc.
├── components/
│   ├── layout/
│   │   ├── Header.tsx       # Sticky nav with role-based links, theme toggle
│   │   ├── Footer.tsx       # Site footer
│   │   └── MainLayout.tsx   # Outlet wrapper with Header + Footer + FeedbackButton
│   ├── HardwareCard.tsx     # Equipment card for inventory grid
│   ├── StatusBadge.tsx      # Pill badges for availability / fault / request status
│   └── FeedbackButton.tsx   # Floating feedback button + modal
├── pages/
│   ├── Login.tsx            # Split-screen login with college + role selector
│   ├── Home.tsx             # Landing page with hero, stats, features
│   ├── Inventory.tsx        # Filterable hardware grid
│   ├── HardwareDetail.tsx   # Full detail page with timeline
│   ├── RequestIssue.tsx     # Multi-section request form (individual + team)
│   ├── MyRequests.tsx       # Student's request tracker with workflow timeline
│   ├── Messages.tsx         # Threaded messaging with 50-word limit
│   ├── Teams.tsx            # Team management (student / faculty / admin views)
│   ├── AdminDashboard.tsx   # Stats, all requests, respond modal, feedback inbox
│   ├── FacultyDashboard.tsx # Pending requests, verify/reject, history
│   ├── FaultScan.tsx        # Scanner + scan history + status guide
│   ├── Guidelines.tsx       # Usage policy cards + best practices
│   └── NotFound.tsx         # 404 page
├── App.tsx                  # Router setup with protected routes
└── main.tsx                 # Entry point
```

---

## ✨ Features

### Authentication
- College selector (Parul University, MS University, SVNIT, PDPU, GEC Vadodara)
- Role-based login: **Student**, **Faculty**, **Admin/Lab Assistant**
- Different dashboards and navigation per role

### Equipment Inventory
- 13+ hardware items across 8 categories
- Real-time availability and fault scan status badges
- Filter by name, category, and status
- Full detail pages with usage timeline

### Request Workflow
- **Student** submits request with: equipment, project details, professor selection, date range (max 14 days)
- Request goes to **Faculty** for verification → then **Lab Assistant** for final approve/reject
- Lab assistant sends a ≤50-word message to student with collection details
- Both **individual** and **team** request types supported

### Team Projects
- **Faculty** creates teams, uploads member Excel sheet (simulated), system generates unique Team ID
- All team members can use the Team ID to issue equipment
- Individual issuance is **locked** while team project is active
- Professor can mark project as completed to unlock individual IDs

### Messaging
- Threaded conversations per participant
- **50-word hard limit** with live counter
- Lab assistant messages are surfaced in request cards

### Feedback System
- Floating **Feedback** button visible to all logged-in users
- Select department, feedback type, write suggestion, optional star rating
- All feedback visible to **Admin** in a dedicated inbox tab with unread badge
- Admin can mark feedback as read

### Dark / Light Theme
- Toggle in header — persists via CSS class on `<html>`

---

## 🛠️ Tech Stack

| Tool | Purpose |
|------|---------|
| React 18 + TypeScript | UI framework |
| Vite | Build tool |
| React Router v6 | Client-side routing |
| Tailwind CSS v3 | Styling |
| Sonner | Toast notifications |
| Lucide React | Icons |
| Context API | Global state (no Redux needed) |

---

## 📝 Notes

- All data is in-memory (no backend). State resets on page refresh.
- To add a real backend, replace `AppContext.tsx` state with API calls.
- Images for hardware items can be added by updating `hardwareData.ts` with real URLs.
