# AGENT FORGE — Case Study Evaluation Platform

**Agent Forge** is a full-stack web application designed for high-concurrency hackathons, university competitions, and engineering case study symposiums.

Built with a **White Technical Grid** visual aesthetic, **Google Sans** typography hierarchy, and a standardized **Google Four-Color Identity System** (`#4285F4`, `#EA4335`, `#FBBC05`, `#34A853`).

---

## 🚀 Live Access & Quick Demo Credentials

The platform is running on `http://localhost:5000`. A **Fast Role Switch** strip is pinned to the top of the interface allowing instant 1-click test access across all roles without typing passwords.

| Role | Name | Email | Password / Passkey |
| :--- | :--- | :--- | :--- |
| **Admin** | Chief Administrator | `admin@agentforge.io` | `Admin@Forge2026!` |
| **Jury** | Dr. Priya Ramaswamy | `jury.priya@agentforge.io` | `Jury@Forge2026!` |
| **Jury** | Prof. Marcus Vance | `jury.marcus@agentforge.io` | `Jury@Forge2026!` |
| **Jury** | Elena Rostova | `jury.elena@agentforge.io` | `Jury@Forge2026!` |
| **Participant** | Haswin Singh (Evaluated) | `sec24cs101@sairamtap.edu.in` | `sec24cs101` *(Prefix before @)* |
| **Participant** | Ananya Gupta (Under Review) | `sec24cs106@sairamtap.edu.in` | `sec24cs106` |
| **Participant** | Rahul Sen (Not Started) | `sec24cs116@sairamtap.edu.in` | `sec24cs116` |

---

## 🏛️ Core User Roles & Security Matrix

| Feature | Participant | Jury | Admin |
| :--- | :---: | :---: | :---: |
| **Login** | ✅ | ✅ | ✅ |
| **View Own Case Study** | ✅ | — | ✅ |
| **Submit Solution & Upload Files** | ✅ | — | ✅ |
| **View Own Submission** | ✅ | — | ✅ |
| **View Assigned Submissions Queue** | — | ✅ | ✅ |
| **Evaluate Submissions (5 Criteria /50)** | — | ✅ | ✅ |
| **Manage Participants & Bulk Excel Intake** | — | — | ✅ |
| **Manage Jury Panel & Assignments** | — | — | ✅ |
| **Manage Case Studies & Deadlines** | — | — | ✅ |
| **Publish / Unpublish Results** | — | — | ✅ |
| **Export Master 4-Sheet Excel Workbook** | — | — | ✅ |
| **Export Authorized Evaluation Spreadsheet** | — | ✅ | ✅ |
| **Download Official Branded PDF Scorecard** | ✅ *(Post-Publish)* | ✅ | ✅ |
| **View Immutable Audit Logs** | — | — | ✅ |

---

## ⚖️ Standardized 5-Criteria Jury Scoring System

Every submission is evaluated against **exactly 5 criteria**, each weighted from **0.0 to 10.0 points** for a maximum of **50.00 points**:

1. **Problem Understanding & Boundary Conditions** `[0 – 10]`
2. **Innovation & Agentic Architecture** `[0 – 10]`
3. **Technical Implementation & Engineering Rigor** `[0 – 10]`
4. **Feasibility, Scalability & Operational Impact** `[0 – 10]`
5. **Presentation, Reproducibility & Code Quality** `[0 – 10]`

- **Auto-Calculated Total:** Precision calculation updated dynamically as sliders move.
- **Save Draft vs. Submit:** Draft evaluations remain editable; final submissions are immediately locked against tampering.
- **Multiple Jury Aggregation:** Individual juror evaluations are stored independently. Admin configures aggregation mode (**Average score**, **Highest score**, or **Manual override**).
- **Admin Unlock:** If a juror needs to revise a locked evaluation, Admin can explicitly unlock it from the submission console.

---

## 📊 Result Governance & Atomic Publication

- **Strict Participant Masking:** Participants can **never** view jury marks, comments, or ranks until Admin explicitly publishes results.
- **Leaderboard Tie-Breaking:** Rankings are automatically computed using competition dense-ranking standards.
- **Publication Confirmation Dialog:** Requires explicit confirmation: `"PUBLISH RESULTS"`.
- **Transactional Consistency:** Publication updates all submission states, notifies active participants, and generates verifiable PDF scorecards in an atomic transaction.
- **Retraction / Unpublish:** Admin can unpublish results anytime if manual score overrides or committee reviews are needed.

---

## 📑 Excel & PDF Document Generation

### 1. Master 4-Sheet Excel Workbook (`.xlsx`)
Admin downloads `Agent_Forge_Master_Data.xlsx` featuring:
- **Sheet 1 — Participants:** Participant ID, Name, Official Email, Case Study, Login Status, Submission Status, Submission Time.
- **Sheet 2 — Submissions:** Submission ID, Participant ID, Case Study, GitHub URL, Uploaded Files Count, Submission Time, Status.
- **Sheet 3 — Evaluations:** Submission ID, Participant ID, Jury, 5-Criteria Scores, Total Score (/50), Comments, Evaluation Time.
- **Sheet 4 — Final Results:** Rank, Participant ID, Participant Name, Case Study, Final Score, Maximum Score, Result Status.

### 2. Bulk Participant Excel Intake
- Upload institutional Excel rosters (`.xlsx` or `.xls`).
- **Interactive Preview Dialog:** Analyzes rows, detects valid entries, flags syntax errors, and isolates duplicates.
- **Automatic Passkey Generation:** Generates default passkey from the portion before `@` (e.g. `sec24cs103@sairamtap.edu.in` ➔ `sec24cs103`). Passkeys are securely hashed with `bcryptjs` before insertion.

### 3. Official Branded PDF Scorecard & Leaderboards
- Generates high-resolution vector PDFs via `pdfkit` styled with the **Google Four-Color Accent Bar**, standardized rubric breakdown, individual rank standing, jury feedback, and cryptographic verification timestamp.

---

## 🏗️ Technology Stack & Concurrency Architecture

- **Backend:** Node.js (v26) + Express with pure asynchronous REST endpoints.
- **Database:** High-concurrency SQLite engine with **WAL mode (`Write-Ahead Logging`)**, immediate transaction locks, foreign key cascade constraints, and indexed lookups on emails, participant codes, submission IDs, and jury queues.
- **Storage:** Secure disk object store with sanitized server-side filenames, mime-type verification, and streaming downloads.
- **Frontend:** React 19 + Vite with zero Tailwind CSS bloat, styled using clean, modular Vanilla CSS variables and Google Sans typography.
- **Role Isolation Middleware:** Every API route verifies JWT signatures, extracts user context, and enforces role boundaries directly in backend controllers.

---

## 🛠️ Local Development & Scripts

```bash
# Install dependencies
npm install
npm --prefix client install

# Seed database with realistic competition demo data (20 participants, 3 jurors, 1 admin, 5 case studies)
npm run seed

# Build production bundle
npm run build

# Start production server (serves API and client on port 5000)
npm start

# Run end-to-end API test validation suite
node test-e2e.js
```

---

## 🔒 Security Measures

- **No Plaintext Credentials:** Passwords and default passkeys are salted and hashed using `bcryptjs`.
- **Private Object Storage:** Uploaded submission files are accessed only via authorized backend streaming endpoints (`/api/submissions/:id/files/:fileId/download`).
- **Input Validation:** Enforces strict regex validation on GitHub repository URLs, file extensions, and file sizes (up to 50MB).
- **Audit Ledger:** Every login attempt, submission, jury mark, and result publication event is committed to an immutable `audit_logs` table.
