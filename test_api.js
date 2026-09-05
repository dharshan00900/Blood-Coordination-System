const app = require('./src/app');
const http = require('http');

async function testSuite() {
  const server = app.listen(5099);
  const baseURL = 'http://localhost:5099/api';

  try {
    console.log('--- Starting LifeLink Automated Backend Tests ---');

    // 1. Health Check
    const resHealth = await fetch(`${baseURL}/health`).then(r => r.json());
    console.log('✓ Health Check:', resHealth.platform, '| Version:', resHealth.version);

    // 2. Demo Accounts
    const resDemo = await fetch(`${baseURL}/auth/demo-accounts`).then(r => r.json());
    console.log(`✓ Demo Accounts loaded: ${resDemo.accounts.length} test accounts available`);

    // 3. Donor Login (Rajesh Kumar, O+)
    const resDonorLogin = await fetch(`${baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'rajesh.erode@gmail.com', password: 'Donor@123' })
    }).then(r => r.json());

    if (!resDonorLogin.success) throw new Error('Donor login failed: ' + resDonorLogin.message);
    const donorToken = resDonorLogin.token;
    console.log('✓ Donor Login success:', resDonorLogin.user.name, `(${resDonorLogin.profile.blood_group})`);

    // 4. Hospital Login (Lotus Emergency Hospital)
    const resHospLogin = await fetch(`${baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'lotus.erode@hospital.org', password: 'Hospital@123' })
    }).then(r => r.json());

    if (!resHospLogin.success) throw new Error('Hospital login failed: ' + resHospLogin.message);
    const hospToken = resHospLogin.token;
    console.log('✓ Hospital Login success:', resHospLogin.user.name);

    // 5. Hospital creates emergency blood request (O+, Erode, 2 units, Critical)
    const resCreateReq = await fetch(`${baseURL}/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${hospToken}`
      },
      body: JSON.stringify({
        bloodGroupNeeded: 'O+',
        hospitalName: 'Lotus Emergency Hospital',
        hospitalLocation: 'Poondurai Road, Erode',
        hospitalDistrict: 'Erode',
        unitsRequired: 2,
        urgency: 'CRITICAL',
        notes: 'Urgent emergency surgery requiring immediate transfusion.'
      })
    }).then(r => r.json());

    if (!resCreateReq.success) throw new Error('Create request failed: ' + resCreateReq.message);
    const newReqId = resCreateReq.request.id;
    console.log(`✓ Emergency Request Created: [${resCreateReq.request.reference_no}] Status: ${resCreateReq.request.status}`);
    console.log(`  Matching round initiated: Round ${resCreateReq.matchSummary.round}, ${resCreateReq.matchSummary.notifiedCount} donors alerted.`);

    // 6. Check Ranked Matches
    const resMatches = await fetch(`${baseURL}/requests/${newReqId}/matches`, {
      headers: { 'Authorization': `Bearer ${hospToken}` }
    }).then(r => r.json());

    console.log(`✓ AI Matching Engine produced ${resMatches.potentialDonorsPool.length} eligible ranked donors.`);
    const topDonor = resMatches.potentialDonorsPool[0];
    console.log(`  Top Candidate: ${topDonor.name} (${topDonor.blood_group}) | AI Match Score: ${topDonor.ai_match_score}%`);
    console.log(`  AI Explanations:`, topDonor.score_reasons);

    // 7. Donor responds "ACCEPTED" ("I CAN HELP")
    const resRespond = await fetch(`${baseURL}/donor/requests/${newReqId}/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${donorToken}`
      },
      body: JSON.stringify({ response: 'ACCEPTED' })
    }).then(r => r.json());

    if (!resRespond.success) throw new Error('Donor response failed: ' + resRespond.message);
    console.log(`✓ Donor Response Recorded: [${resRespond.response}] -> Status: ${resRespond.status}`);
    console.log(`  AI Priority Score: ${resRespond.aiMatchScore}%`);

    // 8. Hospital verifies donor match
    const resUpdatedReq = await fetch(`${baseURL}/requests/${newReqId}/matches`, {
      headers: { 'Authorization': `Bearer ${hospToken}` }
    }).then(r => r.json());

    const acceptedResp = resUpdatedReq.responses.find(r => r.donor_id === 4);
    if (acceptedResp) {
      const resVerify = await fetch(`${baseURL}/requests/${newReqId}/verify-match`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${hospToken}`
        },
        body: JSON.stringify({ responseId: acceptedResp.response_id, notes: 'Donor blood type and ID verified.' })
      }).then(r => r.json());
      console.log('✓ Hospital Match Verification:', resVerify.message);
    }

    console.log('--- ALL BACKEND TEST PASSES SUCCEEDED ---');
  } finally {
    server.close();
  }
}

testSuite().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
