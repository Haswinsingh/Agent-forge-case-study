const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const { db, run, query, get } = require('./database');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Create sample solution file mock
const samplePdfPath = path.join(UPLOADS_DIR, 'sample_solution_architecture.pdf');
if (!fs.existsSync(samplePdfPath)) {
  fs.writeFileSync(samplePdfPath, '%PDF-1.4\n%Agent Forge Sample Technical Architecture Document\n1 0 obj\n<< /Title (Agent Forge Technical Proposal) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF');
}

const sampleZipPath = path.join(UPLOADS_DIR, 'source_code_bundle.zip');
if (!fs.existsSync(sampleZipPath)) {
  fs.writeFileSync(sampleZipPath, 'PK\x03\x04AgentForgeSampleSourceCodeZipArchive');
}

async function seed() {
  console.log('Seeding Agent Forge database with realistic competition data...');

  // Clear existing data in reverse dependency order
  db.exec(`
    DELETE FROM audit_logs;
    DELETE FROM notifications;
    DELETE FROM evaluations;
    DELETE FROM jury_assignments;
    DELETE FROM submission_files;
    DELETE FROM submissions;
    DELETE FROM participants;
    DELETE FROM jury_members;
    DELETE FROM case_studies;
    DELETE FROM system_settings;
    DELETE FROM users;
  `);

  const saltRounds = 10;
  const adminHash = await bcrypt.hash('Admin@Forge2026!', saltRounds);
  const juryHash = await bcrypt.hash('Jury@Forge2026!', saltRounds);

  // 1. Seed Admin
  run(`
    INSERT INTO users (email, password_hash, role, name, is_active)
    VALUES (?, ?, 'admin', 'Chief Administrator (Agent Forge)', 1)
  `, ['admin@agentforge.io', adminHash]);

  // 2. Seed 3 Jury Members
  const jurors = [
    { name: 'Dr. Priya Ramaswamy', email: 'jury.priya@agentforge.io', juryId: 'JURY-01', dept: 'AI & Systems Research' },
    { name: 'Prof. Marcus Vance', email: 'jury.marcus@agentforge.io', juryId: 'JURY-02', dept: 'Distributed Computing' },
    { name: 'Elena Rostova', email: 'jury.elena@agentforge.io', juryId: 'JURY-03', dept: 'Venture & Engineering Review' }
  ];

  const jurorDbIds = [];
  for (const j of jurors) {
    const res = run(`
      INSERT INTO users (email, password_hash, role, name, is_active)
      VALUES (?, ?, 'jury', ?, 1)
    `, [j.email, juryHash, j.name]);
    
    const userId = Number(res.lastInsertRowid);
    const jRes = run(`
      INSERT INTO jury_members (user_id, jury_id, department, status)
      VALUES (?, ?, ?, 'active')
    `, [userId, j.juryId, j.dept]);
    jurorDbIds.push(Number(jRes.lastInsertRowid));
  }

  // 3. Seed 5 Case Studies
  const defaultCriteria = JSON.stringify([
    { id: 'crit_1', name: 'Problem Understanding', max: 10, description: 'Comprehension of domain constraints and boundary conditions.' },
    { id: 'crit_2', name: 'Innovation & Creativity', max: 10, description: 'Novelty of methodology and agentic orchestration architecture.' },
    { id: 'crit_3', name: 'Technical Implementation', max: 10, description: 'Code quality, test coverage, efficiency, and engineering rigor.' },
    { id: 'crit_4', name: 'Feasibility & Impact', max: 10, description: 'Real-world viability, operational cost, and benchmark performance.' },
    { id: 'crit_5', name: 'Presentation & Overall Quality', max: 10, description: 'Clarity of documentation, reproducibility, and architectural diagrams.' }
  ]);

  const caseStudiesData = [
    {
      cid: 'AF-CS001',
      title: 'AI-Powered Autonomous Disaster Relief Coordinator',
      desc: 'Deploy resilient multi-agent swarm coordinating emergency logistics under degraded telecommunications networks.',
      problem: 'During catastrophic flooding or seismic events, cellular networks collapse. Design an offline-first multi-agent dispatch mesh that dynamically recalculates supply routes, prioritizes medical airlift manifests, and guarantees data eventual consistency over ad-hoc peer-to-peer radio.',
      instructions: 'Submit a complete architectural specification (PDF/DOCX), runnable code repository with unit tests, and performance benchmark simulation report under 50% packet drop rates.',
      deadline: '2026-10-30T23:59:59Z',
      status: 'Active',
      scoringMode: 'average'
    },
    {
      cid: 'AF-CS002',
      title: 'Decentralized Zero-Knowledge Medical Record Ledger',
      desc: 'Cryptographic patient data orchestration preserving HIPPA compliance while facilitating instant multi-hospital emergency queries.',
      problem: 'Hospital networks require seamless cross-institutional medical triage queries without revealing sensitive genomic or history data. Design a zk-SNARK verification protocol enabling verifiably authentic diagnostic checks.',
      instructions: 'Deliver smart contract or protocol code with cryptographic proof generation benchmarks and system threat model documentation.',
      deadline: '2026-10-28T23:59:59Z',
      status: 'Active',
      scoringMode: 'average'
    },
    {
      cid: 'AF-CS003',
      title: 'Multi-Agent Edge Intelligence for Smart Grid Resilience',
      desc: 'Microsecond-scale load-balancing agents mitigating cascade blackout events in renewable-heavy regional grids.',
      problem: 'High solar/wind volatility causes rapid frequency fluctuations. Develop decentralized agent nodes deployed at transformer substations capable of autonomous islanding and phase synchronization.',
      instructions: 'Provide mathematical formulations, simulation results using IEEE test feeder configurations, and clean GitHub repository.',
      deadline: '2026-10-25T23:59:59Z',
      status: 'Active',
      scoringMode: 'average'
    },
    {
      cid: 'AF-CS004',
      title: 'Neural Code Synthesis with Formal Semantic Verification',
      desc: 'Constrained generative AI pipeline producing provably correct distributed consensus primitives with Coq/Lean formal verification.',
      problem: 'LLMs hallucinate subtle concurrent race conditions in mission-critical software. Build an iterative repair agent loop backed by formal solvers that proves safety invariants.',
      instructions: 'Submit formal proof proofs, agent synthesizer runtime logs, and reproducible benchmarks across classic distributed algorithms.',
      deadline: '2026-11-05T23:59:59Z',
      status: 'Published',
      scoringMode: 'average'
    },
    {
      cid: 'AF-CS005',
      title: 'Low-Latency Algorithmic Liquidity Router for Cross-Border FX',
      desc: 'High-throughput execution router minimizing slippage across fragmented decentralized and centralized orderbooks.',
      problem: 'Market fragmentation and MEV frontrunning incur high slippage for cross-currency transfers. Design a low-latency execution routing engine with predictive price impact mitigation.',
      instructions: 'Provide C++/Rust or optimized TypeScript backtesting engine, slippage distribution analysis, and architecture whitepaper.',
      deadline: '2026-11-10T23:59:59Z',
      status: 'Draft',
      scoringMode: 'average'
    }
  ];

  const caseStudyDbIds = [];
  for (const cs of caseStudiesData) {
    const csRes = run(`
      INSERT INTO case_studies (
        case_study_id, title, description, problem_statement, instructions,
        attached_resources, deadline, allowed_file_types, max_upload_size_mb,
        github_required, status, criteria_config, scoring_mode
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      cs.cid, cs.title, cs.desc, cs.problem, cs.instructions,
      JSON.stringify([{ name: 'Specification_Brief_v2.pdf', url: '/uploads/sample_solution_architecture.pdf' }]),
      cs.deadline, 'PDF,DOC,DOCX,ZIP,PPT,PPTX,XLS,XLSX', 50,
      1, cs.status, defaultCriteria, cs.scoringMode
    ]);
    caseStudyDbIds.push(Number(csRes.lastInsertRowid));
  }

  // 4. Seed 20 Participants
  const participantNames = [
    'Haswin Singh', 'Aarav Sharma', 'Meera Krishnan', 'Aditya Verma',
    'Rohan Kulkarni', 'Ananya Gupta', 'Siddharth Iyer', 'Diya Nambiar',
    'Varun Deshmukh', 'Pooja Reddy', 'Nikhil Chawla', 'Kavya Pillai',
    'Arjun Nair', 'Sneha Bannerjee', 'Karthik Raja', 'Bhavya Patel',
    'Rahul Sen', 'Tanya Kapoor', 'Gaurav Joshi', 'Divya Sundaram'
  ];

  const participantDbIds = [];
  const participantEntities = [];

  for (let i = 101; i <= 120; i++) {
    const padNum = i.toString();
    const emailPrefix = `sec24cs${padNum}`;
    const email = `${emailPrefix}@sairamtap.edu.in`;
    const defaultPasskey = emailPrefix;
    const name = participantNames[i - 101];
    const passkeyHash = await bcrypt.hash(defaultPasskey, saltRounds);

    const uRes = run(`
      INSERT INTO users (email, password_hash, role, name, is_active)
      VALUES (?, ?, 'participant', ?, 1)
    `, [email, passkeyHash, name]);
    const userId = Number(uRes.lastInsertRowid);

    // Assign to case studies (round robin across active case studies 0, 1, 2)
    const assignedCsId = caseStudyDbIds[(i - 101) % 3];
    const teamName = i % 2 === 0 ? `Team Apex-${Math.ceil((i - 100) / 2)}` : `Team Forge-${Math.ceil((i - 100) / 2)}`;

    const pRes = run(`
      INSERT INTO participants (user_id, participant_id, team_name, assigned_case_study_id, default_passkey, status)
      VALUES (?, ?, ?, ?, ?, 'active')
    `, [userId, `AF-PART-${padNum}`, teamName, assignedCsId, defaultPasskey]);

    const pId = Number(pRes.lastInsertRowid);
    participantDbIds.push(pId);
    participantEntities.push({
      id: pId,
      userId,
      participantId: `AF-PART-${padNum}`,
      name,
      email,
      assignedCsId,
      padNum
    });
  }

  // 5. Seed Submissions & Evaluations for first 15 participants
  // 5 participants will be NOT STARTED / IN PROGRESS
  const submissionDbIds = [];

  for (let i = 0; i < 15; i++) {
    const p = participantEntities[i];
    const subCode = `AF-CS00${((i % 3) + 1)}-SUB-${p.padNum}`;
    const githubRepo = `https://github.com/sairam-forge/${p.participantId.toLowerCase()}-mesh-solution`;

    // Vary status across participants to showcase all states:
    // 0-4: EVALUATED
    // 5-9: UNDER REVIEW
    // 10-14: SUBMITTED
    let subStatus = 'SUBMITTED';
    if (i < 5) subStatus = 'EVALUATED';
    else if (i < 10) subStatus = 'UNDER REVIEW';

    const subRes = run(`
      INSERT INTO submissions (
        submission_id, participant_id, case_study_id, solution_description,
        github_url, status, submission_timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, datetime('now', '-' || ? || ' hours'))
    `, [
      subCode, p.id, p.assignedCsId,
      `Comprehensive architectural implementation and validation suite for ${p.participantId}. Includes decentralized consensus mechanisms, robust failure recovery tests, and interactive dashboard telemetry.`,
      githubRepo, subStatus, (15 - i) * 3
    ]);

    const subId = Number(subRes.lastInsertRowid);
    submissionDbIds.push({ subId, p, subStatus });

    // Attach sample files
    run(`
      INSERT INTO submission_files (submission_id, storage_key, original_filename, file_size, mime_type)
      VALUES (?, ?, ?, ?, ?)
    `, [subId, 'sample_solution_architecture.pdf', `${p.participantId}_Technical_Architecture.pdf`, 1420800, 'application/pdf']);

    run(`
      INSERT INTO submission_files (submission_id, storage_key, original_filename, file_size, mime_type)
      VALUES (?, ?, ?, ?, ?)
    `, [subId, 'source_code_bundle.zip', `${p.participantId}_source_code_v1.0.zip`, 4892100, 'application/zip']);

    // Assign Jury Members (assign each submission to 2-3 jurors)
    for (let jIdx = 0; jIdx < jurorDbIds.length; jIdx++) {
      run(`
        INSERT INTO jury_assignments (jury_id, submission_id)
        VALUES (?, ?)
      `, [jurorDbIds[jIdx], subId]);
    }

    // If EVALUATED or UNDER REVIEW, add evaluations
    if (i < 5) {
      // Fully evaluated by all 3 jurors
      let scoresSum = 0;
      const jurorScores = [
        { c1: 9.0, c2: 8.5, c3: 9.5, c4: 9.0, c5: 9.0, comments: 'Exemplary distributed state handling and thorough test coverage.' },
        { c1: 8.5, c2: 9.0, c3: 9.0, c4: 8.5, c5: 9.0, comments: 'Novel protocol abstraction with solid mathematical grounding.' },
        { c1: 9.5, c2: 9.0, c3: 9.0, c4: 9.5, c5: 9.5, comments: 'Outstanding production readiness and clear documentation.' }
      ];

      // Add small variance per participant
      const delta = (i * 0.7);

      for (let jIdx = 0; jIdx < jurorDbIds.length; jIdx++) {
        const js = jurorScores[jIdx];
        const c1 = Math.min(10, Math.max(5, +(js.c1 - delta * 0.2).toFixed(1)));
        const c2 = Math.min(10, Math.max(5, +(js.c2 - delta * 0.3).toFixed(1)));
        const c3 = Math.min(10, Math.max(5, +(js.c3 - delta * 0.2).toFixed(1)));
        const c4 = Math.min(10, Math.max(5, +(js.c4 - delta * 0.1).toFixed(1)));
        const c5 = Math.min(10, Math.max(5, +(js.c5 - delta * 0.2).toFixed(1)));
        const total = +(c1 + c2 + c3 + c4 + c5).toFixed(2);
        scoresSum += total;

        run(`
          INSERT INTO evaluations (
            submission_id, jury_id, criterion_1, criterion_2, criterion_3,
            criterion_4, criterion_5, total_score, comments, status, is_locked
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', 1)
        `, [subId, jurorDbIds[jIdx], c1, c2, c3, c4, c5, total, js.comments]);
      }

      const avgScore = +(scoresSum / jurorDbIds.length).toFixed(2);
      run(`
        UPDATE submissions
        SET final_score = ?, rank = ?
        WHERE id = ?
      `, [avgScore, i + 1, subId]);

    } else if (i < 10) {
      // Partially evaluated (1 juror evaluated, 1 drafted)
      run(`
        INSERT INTO evaluations (
          submission_id, jury_id, criterion_1, criterion_2, criterion_3,
          criterion_4, criterion_5, total_score, comments, status, is_locked
        ) VALUES (?, ?, 8.0, 7.5, 8.5, 8.0, 8.5, 40.5, 'Solid architecture, waiting on benchmark verification.', 'submitted', 1)
      `, [subId, jurorDbIds[0]]);

      run(`
        INSERT INTO evaluations (
          submission_id, jury_id, criterion_1, criterion_2, criterion_3,
          criterion_4, criterion_5, total_score, comments, status, is_locked
        ) VALUES (?, ?, 7.5, 8.0, 7.0, 7.5, 7.5, 37.5, 'Initial review in progress. Reviewing repo tests.', 'draft', 0)
      `, [subId, jurorDbIds[1]]);
    }
  }

  // Set global system settings
  run(`
    INSERT INTO system_settings (key, value)
    VALUES ('results_published', '0'),
           ('platform_name', 'Agent Forge'),
           ('competition_title', 'Autonomous Agent Engineering Challenge 2026'),
           ('scoring_aggregation_mode', 'average')
  `);

  // Notifications
  const adminUser = get(`SELECT id FROM users WHERE role = 'admin'`);
  run(`
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (?, 'Platform Initialized', 'Agent Forge system seed loaded with 20 participants, 3 jurors, and 5 case studies.', 'info')
  `, [adminUser.id]);

  for (const j of jurors) {
    const jUser = get(`SELECT id FROM users WHERE email = ?`, [j.email]);
    run(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (?, 'Submissions Assigned', 'You have been assigned 15 submissions for evaluation in the Autonomous Agent Challenge.', 'info')
    `, [jUser.id]);
  }

  // Audit Log sample events
  run(`
    INSERT INTO audit_logs (user_email, user_role, action, target, ip_address, details, status)
    VALUES ('admin@agentforge.io', 'admin', 'SYSTEM_INITIALIZE', 'System Core', '127.0.0.1', 'Configured seed database and 5 case studies', 'SUCCESS'),
           ('admin@agentforge.io', 'admin', 'BULK_IMPORT', 'Participants', '127.0.0.1', 'Imported 20 official college participants from register', 'SUCCESS'),
           ('jury.priya@agentforge.io', 'jury', 'EVALUATION_SUBMITTED', 'AF-CS001-SUB-001', '192.168.1.10', 'Submitted score 45.0/50 for AF-PART-001', 'SUCCESS')
  `);

  console.log('✅ Seed completed successfully:');
  console.log(' - 1 Admin: admin@agentforge.io (Password: Admin@Forge2026!)');
  console.log(' - 3 Jurors: jury.priya@agentforge.io, jury.marcus@agentforge.io, jury.elena@agentforge.io (Password: Jury@Forge2026!)');
  console.log(' - 20 Participants: sec24cs101@sairamtap.edu.in to sec24cs120@sairamtap.edu.in (Passkey: email prefix e.g. sec24cs101)');
  console.log(' - 5 Case Studies (AF-CS001 to AF-CS005)');
  console.log(' - 15 Submissions (5 Evaluated, 5 Under Review, 5 Submitted, 5 Not Started)');
}

if (require.main === module) {
  seed().catch(err => {
    console.error('Seed error:', err);
    process.exit(1);
  });
}

module.exports = { seed };
