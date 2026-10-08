const assert = require('assert');

async function runTests() {
  console.log('🧪 Starting Agent Forge End-to-End API & Business Logic Validation...\n');
  const baseUrl = 'http://localhost:5000/api';

  // 1. Participant Authentication & Passkey
  console.log('1️⃣ Testing Participant Login with auto-derived passkey...');
  const partLoginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'sec24cs101@sairamtap.edu.in', password: 'sec24cs101' })
  });
  assert.strictEqual(partLoginRes.status, 200, 'Participant login failed');
  const partAuth = await partLoginRes.json();
  assert.strictEqual(partAuth.user.role, 'participant');
  assert.ok(partAuth.token, 'Token missing');
  console.log(`   ✅ Participant Authenticated: ${partAuth.user.name} (${partAuth.user.email})`);

  // 2. Participant Queries Assigned Case Study
  console.log('2️⃣ Testing Participant Case Study Retrieval...');
  const csRes = await fetch(`${baseUrl}/case-studies`, {
    headers: { 'Authorization': `Bearer ${partAuth.token}` }
  });
  const caseStudies = await csRes.json();
  assert.ok(caseStudies.length > 0, 'No case studies returned');
  console.log(`   ✅ Assigned Track: ${caseStudies[0].case_study_id} — ${caseStudies[0].title}`);

  // 3. Jury Authentication
  console.log('3️⃣ Testing Jury Authentication...');
  const juryLoginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'jury.priya@agentforge.io', password: 'Jury@Forge2026!' })
  });
  assert.strictEqual(juryLoginRes.status, 200, 'Jury login failed');
  const juryAuth = await juryLoginRes.json();
  assert.strictEqual(juryAuth.user.role, 'jury');
  console.log(`   ✅ Jury Authenticated: ${juryAuth.user.name} (${juryAuth.user.jury.jury_id})`);

  // 4. Jury Evaluates a Submission with 5 Criteria
  console.log('4️⃣ Testing 5-Criteria Standardized Evaluation Submission...');
  const jurySubsRes = await fetch(`${baseUrl}/submissions`, {
    headers: { 'Authorization': `Bearer ${juryAuth.token}` }
  });
  const jurySubs = await jurySubsRes.json();
  assert.ok(jurySubs.length > 0, 'No submissions for jury');
  const targetSub = jurySubs.find(s => !s.my_eval_locked) || jurySubs[jurySubs.length - 1];

  const evalPostRes = await fetch(`${baseUrl}/evaluations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${juryAuth.token}`
    },
    body: JSON.stringify({
      submission_id: targetSub.id,
      criterion_1: 9.5,
      criterion_2: 9.0,
      criterion_3: 9.5,
      criterion_4: 9.0,
      criterion_5: 9.0,
      comments: 'Exemplary agentic state management and robust error boundaries.',
      status: 'submitted'
    })
  });
  assert.strictEqual(evalPostRes.status, 200, 'Evaluation submission failed');
  const evalResult = await evalPostRes.json();
  assert.strictEqual(evalResult.total_score, 46.0);
  console.log(`   ✅ Evaluation Recorded: Total ${evalResult.total_score}/50 (${evalResult.status})`);

  // 5. Admin Authentication & Dashboard Stats
  console.log('5️⃣ Testing Admin Authentication & KPI Engine...');
  const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@agentforge.io', password: 'Admin@Forge2026!' })
  });
  assert.strictEqual(adminLoginRes.status, 200, 'Admin login failed');
  const adminAuth = await adminLoginRes.json();
  assert.strictEqual(adminAuth.user.role, 'admin');

  const statsRes = await fetch(`${baseUrl}/results/dashboard-stats`, {
    headers: { 'Authorization': `Bearer ${adminAuth.token}` }
  });
  const stats = await statsRes.json();
  assert.ok(stats.totalParticipants >= 20, 'Stats mismatch');
  console.log(`   ✅ Admin Metrics: ${stats.totalParticipants} Participants, ${stats.totalSubmissions} Submissions, Highest: ${stats.highestScore}/50`);

  // 6. Master Multi-Sheet Excel Export
  console.log('6️⃣ Testing 4-Sheet Master Excel Export...');
  const excelRes = await fetch(`${baseUrl}/reports/excel/master`, {
    headers: { 'Authorization': `Bearer ${adminAuth.token}` }
  });
  assert.strictEqual(excelRes.status, 200);
  const excelBlob = await excelRes.arrayBuffer();
  assert.ok(excelBlob.byteLength > 1000, 'Excel file too small');
  console.log(`   ✅ Master Excel Generated: ${excelBlob.byteLength} bytes (.xlsx)`);

  // 7. Master PDF Leaderboard Export
  console.log('7️⃣ Testing Master Leaderboard PDF Export...');
  const pdfRes = await fetch(`${baseUrl}/reports/pdf/master`, {
    headers: { 'Authorization': `Bearer ${adminAuth.token}` }
  });
  assert.strictEqual(pdfRes.status, 200);
  const pdfBlob = await pdfRes.arrayBuffer();
  assert.ok(pdfBlob.byteLength > 1000, 'PDF file too small');
  console.log(`   ✅ Master PDF Generated: ${pdfBlob.byteLength} bytes (.pdf)`);

  // 8. Result Publication by Admin
  console.log('8️⃣ Testing Transactional Result Publication...');
  const pubRes = await fetch(`${baseUrl}/results/publish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminAuth.token}`
    },
    body: JSON.stringify({ confirmation: 'CONFIRM_PUBLISH' })
  });
  assert.strictEqual(pubRes.status, 200);
  console.log('   ✅ Official Results Published to Participants!');

  // 9. Participant Result Access after Publication
  console.log('9️⃣ Testing Participant Scorecard Access post-publication...');
  const partResultRes = await fetch(`${baseUrl}/results/my-result`, {
    headers: { 'Authorization': `Bearer ${partAuth.token}` }
  });
  assert.strictEqual(partResultRes.status, 200);
  const partResult = await partResultRes.json();
  assert.strictEqual(partResult.locked, false);
  console.log(`   ✅ Scorecard Visible: ${partResult.submission.participant_name} — Score: ${partResult.submission.final_score}/50 (Rank #${partResult.submission.rank})`);

  // 10. Participant PDF Scorecard Download
  console.log('🔟 Testing Participant Branded PDF Scorecard Download...');
  const partPdfRes = await fetch(`${baseUrl}/reports/pdf/result/${partResult.submission.id}`, {
    headers: { 'Authorization': `Bearer ${partAuth.token}` }
  });
  assert.strictEqual(partPdfRes.status, 200);
  const partPdfBlob = await partPdfRes.arrayBuffer();
  assert.ok(partPdfBlob.byteLength > 1000);
  console.log(`   ✅ Official Candidate PDF Scorecard Generated: ${partPdfBlob.byteLength} bytes`);

  console.log('\n🎉 ALL 10 END-TO-END VERIFICATION CHECKS PASSED PERFECTLY!');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
