const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'agentforge.db');
const db = new DatabaseSync(DB_PATH);

// High-concurrency performance and reliability PRAGMAs
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  PRAGMA synchronous = NORMAL;
  PRAGMA cache_size = -64000;
  PRAGMA temp_store = MEMORY;
`);

// Create Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('participant', 'jury', 'admin')),
    name TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    participant_id TEXT UNIQUE NOT NULL,
    team_name TEXT,
    assigned_case_study_id INTEGER,
    default_passkey TEXT,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'disabled')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(assigned_case_study_id) REFERENCES case_studies(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS jury_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    jury_id TEXT UNIQUE NOT NULL,
    department TEXT DEFAULT 'Evaluation Committee',
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'disabled')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS case_studies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_study_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    problem_statement TEXT NOT NULL,
    instructions TEXT NOT NULL,
    attached_resources TEXT DEFAULT '[]',
    deadline DATETIME NOT NULL,
    allowed_file_types TEXT DEFAULT 'PDF,DOC,DOCX,ZIP,PPT,PPTX,XLS,XLSX',
    max_upload_size_mb INTEGER DEFAULT 50,
    github_required INTEGER DEFAULT 1,
    status TEXT DEFAULT 'Active' CHECK(status IN ('Draft', 'Published', 'Active', 'Closed', 'Results Published')),
    criteria_config TEXT,
    scoring_mode TEXT DEFAULT 'average' CHECK(scoring_mode IN ('average', 'highest', 'manual')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id TEXT UNIQUE NOT NULL,
    participant_id INTEGER NOT NULL,
    case_study_id INTEGER NOT NULL,
    solution_description TEXT,
    github_url TEXT NOT NULL,
    status TEXT DEFAULT 'SUBMITTED' CHECK(status IN ('NOT STARTED', 'IN PROGRESS', 'SUBMITTED', 'UNDER REVIEW', 'EVALUATED', 'RESULT PUBLISHED')),
    submission_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    final_score REAL,
    admin_score_override REAL,
    admin_remarks TEXT,
    rank INTEGER,
    is_locked INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(participant_id) REFERENCES participants(id) ON DELETE CASCADE,
    FOREIGN KEY(case_study_id) REFERENCES case_studies(id) ON DELETE CASCADE,
    UNIQUE(participant_id, case_study_id)
  );

  CREATE TABLE IF NOT EXISTS submission_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id INTEGER NOT NULL,
    storage_key TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    upload_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(submission_id) REFERENCES submissions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS jury_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    jury_id INTEGER NOT NULL,
    submission_id INTEGER NOT NULL,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(jury_id) REFERENCES jury_members(id) ON DELETE CASCADE,
    FOREIGN KEY(submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
    UNIQUE(jury_id, submission_id)
  );

  CREATE TABLE IF NOT EXISTS evaluations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id INTEGER NOT NULL,
    jury_id INTEGER NOT NULL,
    criterion_1 REAL NOT NULL CHECK(criterion_1 >= 0 AND criterion_1 <= 10),
    criterion_2 REAL NOT NULL CHECK(criterion_2 >= 0 AND criterion_2 <= 10),
    criterion_3 REAL NOT NULL CHECK(criterion_3 >= 0 AND criterion_3 <= 10),
    criterion_4 REAL NOT NULL CHECK(criterion_4 >= 0 AND criterion_4 <= 10),
    criterion_5 REAL NOT NULL CHECK(criterion_5 >= 0 AND criterion_5 <= 10),
    total_score REAL NOT NULL CHECK(total_score >= 0 AND total_score <= 50),
    comments TEXT,
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'submitted')),
    is_locked INTEGER DEFAULT 0,
    evaluation_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
    FOREIGN KEY(jury_id) REFERENCES jury_members(id) ON DELETE CASCADE,
    UNIQUE(submission_id, jury_id)
  );

  CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info' CHECK(type IN ('info', 'success', 'warning', 'urgent')),
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_email TEXT,
    user_role TEXT,
    action TEXT NOT NULL,
    target TEXT,
    ip_address TEXT,
    details TEXT,
    status TEXT DEFAULT 'SUCCESS' CHECK(status IN ('SUCCESS', 'FAILURE', 'WARNING'))
  );

  -- High-performance indexes for concurrent access
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
  CREATE INDEX IF NOT EXISTS idx_participants_user ON participants(user_id);
  CREATE INDEX IF NOT EXISTS idx_participants_pid ON participants(participant_id);
  CREATE INDEX IF NOT EXISTS idx_participants_case ON participants(assigned_case_study_id);
  CREATE INDEX IF NOT EXISTS idx_submissions_participant ON submissions(participant_id);
  CREATE INDEX IF NOT EXISTS idx_submissions_case ON submissions(case_study_id);
  CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
  CREATE INDEX IF NOT EXISTS idx_evaluations_submission ON evaluations(submission_id);
  CREATE INDEX IF NOT EXISTS idx_evaluations_jury ON evaluations(jury_id);
  CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
  CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
`);

// Safe query helper utilities
module.exports = {
  db,
  query: (sql, params = []) => {
    return db.prepare(sql).all(...params);
  },
  get: (sql, params = []) => {
    return db.prepare(sql).get(...params);
  },
  run: (sql, params = []) => {
    return db.prepare(sql).run(...params);
  },
  exec: (sql) => {
    return db.exec(sql);
  },
  transaction: (fn) => {
    db.exec('BEGIN IMMEDIATE');
    try {
      const result = fn();
      db.exec('COMMIT');
      return result;
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }
};
