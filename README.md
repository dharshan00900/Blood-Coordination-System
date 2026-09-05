# LifeLink — AI-Powered Emergency Blood Donor Matching & Response Platform

> **Important Medical Disclaimer:**  
> LifeLink is an emergency donor coordination and matching platform. Compatibility and eligibility shown by the system are based on registered member information and configured application rules. Final blood compatibility, donor medical eligibility, and transfusion decisions must be confirmed by qualified healthcare professionals or the relevant blood bank.

---

## 1. Project Overview & Problem Statement

In critical healthcare emergencies—such as road trauma, acute obstetrics hemorrhages, and emergency surgeries—access to compatible blood within the first 15–30 minutes is often the difference between life and death. Traditional blood donation drives and passive registries suffer from:
1. **Donor Fatigue & Alert Spam:** Broadcasting bulk messages to hundreds of donors causes notification fatigue and poor response rates.
2. **Lack of Intelligent Prioritization:** Distance, past response speed, donation waiting periods (90 days), and blood cross-match rules are rarely synthesized dynamically.
3. **No Closed-Loop Escalation:** If initial donors are unavailable, emergency staff must manually dial donor directories under extreme time pressure.

**LifeLink** solves this with an **intelligent, two-layer matching engine** paired with **multi-round batch escalation**, real-time in-app donor notifications, and transparent AI score explanations.

---

## 2. Core Architecture

```
                                  [ Users & Healthcare Staff ]
                                                │
                                    React + Vite Frontend (SPA)
                        (Aesthetic Glassmorphism Healthcare UI, SSE Client)
                                                │
                                                ▼  (REST + SSE)
                                   Node.js / Express Backend API
                                 ┌──────────────┴──────────────┐
                                 ▼                             ▼
                 [ Layer 1: Rule Safety Filter ]    [ Layer 2: AI Ranking Engine ]
                 - Configurable ABO/Rh Matrix       - Probability: P(Help | Features)
                 - 90-Day Waiting Interval Check    - Proximity & Response Latency
                 - Manual Town Proximity (No GPS)   - Explainable Score Rationale
                 - Availability Status Enforcement  - Cold-Start Baseline Model
                                 └──────────────┬──────────────┘
                                                │
                                                ▼
                                    Relational SQLite Database
                                     (WAL Mode, Foreign Keys)
```

---

## 3. Key Features

- **No GPS Tracking (Privacy Guaranteed):** Users manually provide their approximate locality (e.g. *Erode, Perundurai, Coimbatore*). Approximate proximity tiers (vicinity, neighboring district, regional) are computed without ever capturing or exposing live GPS coordinates.
- **Two-Layer Matching Engine:**
  - *Layer 1 (Safety Filter):* Hard clinical rules (ABO/Rh compatibility, 90-day waiting period, account status, availability).
  - *Layer 2 (AI Prioritization):* Calibrated response probability model generating user-friendly priority percentages (e.g. `96% AI Match Score`) with transparent, explainable bullet points.
- **Intelligent Multi-Round Escalation:** Alerts prioritized batches (e.g., Round 1 of 3: top 3–4 candidates). If responses are insufficient within the window, the request escalates to Round 2 and Round 3 pools.
- **Three Dedicated Role Portals:**
  - **Donor Portal:** Availability switch (`🟢 AVAILABLE` / `🔴 UNAVAILABLE`), prominent emergency alert card with `[ I CAN HELP ]` and `[ DECLINE ]`, verified donation history, and days-until-eligible countdown.
  - **Hospital Portal:** `+ Create Emergency Blood Request` modal, real-time response board, candidate review with AI explanations, escalation round controls, and match verification.
  - **Admin Command Center:** System-wide KPIs, blood demand charts, user management (block/unblock), hospital verification, live ABO/Rh compatibility matrix toggle, and audit logging.
- **Fast 1-Click Demo Suite:** Pre-configured demo accounts allowing reviewers and examiners to test the entire flow in seconds without retyping credentials.

---

## 4. Pre-Seeded Demo Accounts

All demo accounts are seeded with realistic Tamil Nadu data and tagged as Demo Data:

| Role | Account Name | Email | Password | Details |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | System Administrator | `admin@lifelink.org` | `Admin@123` | Full administrative control & analytics |
| **Hospital** | Lotus Emergency Hospital | `lotus.erode@hospital.org` | `Hospital@123` | Verified hospital in Erode |
| **Hospital** | KMCH Kovai Medical Center | `kmch.cbe@hospital.org` | `Hospital@123` | Verified hospital in Coimbatore |
| **Donor (O+)** | Rajesh Kumar | `rajesh.erode@gmail.com` | `Donor@123` | Top priority candidate (Erode, available) |
| **Donor (O+)** | Priya Raman | `priya.erode@gmail.com` | `Donor@123` | Active responder (Erode, available) |
| **Donor (O-)** | Ananya Venkataraman | `ananya.cbe@gmail.com` | `Donor@123` | Universal RBC donor (Coimbatore) |
| **Donor (A+)** | Suresh Muthusamy | `suresh.salem@gmail.com` | `Donor@123` | A+ Donor in Salem |

---

## 5. End-to-End Demo Workflow

1. **Open LifeLink:** Navigate to `http://localhost:5173/`.
2. **Login as Hospital:** Click **Switch Demo Role** -> Select **Lotus Hospital (Erode)**.
3. **Create Emergency Request:** Click **+ Create Emergency Request**, fill in blood group `O+`, units `2`, urgency `CRITICAL`, location `Poondurai Road, Erode`, and submit.
4. **AI Matching Dispatched:** The system assigns a reference ID (`LL-REQ-2026-xxx`), runs Layer 1 safety filtering, computes AI scores, and alerts Round 1 donors.
5. **Switch to Donor Rajesh:** Click **Switch Demo Role** -> Select **Rajesh Kumar (O+ Erode)**.
6. **Respond to Alert:** Notice the red pulsing emergency alert card. Click **I CAN HELP**.
7. **View Match Confirmation:** See the confirmation modal showing status `Potential Match (Pending Medical Verification)` along with the AI score breakdown (`96%`).
8. **Switch back to Hospital:** Observe the updated response board. The hospital reviews Rajesh's response and clicks **Verify Match**.
9. **Fulfill Request:** Click **Mark Transfusion Fulfilled** to record the successful donation.

---

## 6. Local Setup & Execution

### Prerequisites
- Node.js v18+ (tested on v22.19.0)
- npm v9+

### Backend Setup
```bash
cd backend
npm install
node src/db/seed.js   # Seeds database with demo records
node src/server.js    # Runs on http://localhost:5000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev           # Runs on http://localhost:5173
```

### Automated Backend Test Suite
```bash
cd backend
node test_api.js
```
