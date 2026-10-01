// Verification script for lot splitting within request action
const baseUrl = 'http://localhost:3000';

async function main() {
  console.log('1. Logging in as staff...');
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'staff@ksu.ac.th', password: 'StaffPassword2026!' })
  });

  if (!loginRes.ok) {
    throw new Error(`Login failed with status ${loginRes.status}: ${await loginRes.text()}`);
  }

  const cookie = loginRes.headers.get('set-cookie');
  console.log('   Logged in successfully. Session cookie acquired.');

  console.log('2. Fetching current workspace assets...');
  const dataRes = await fetch(`${baseUrl}/api/data`, {
    headers: { cookie: cookie || '' }
  });
  if (!dataRes.ok) {
    throw new Error(`Failed to fetch workspace: ${dataRes.status}`);
  }
  const data = await dataRes.json();
  const parentAsset = data.assets.find(a => a.lifecycle === 'active' && a.quantity === 200);

  if (!parentAsset) {
    console.log('   No 200-unit active asset found. Existing active assets:');
    for (const a of data.assets.filter(a => a.lifecycle === 'active')) {
      console.log(`   - ${a.code}: ${a.name} (qty: ${a.quantity})`);
    }
    throw new Error('Target 200-unit asset not found for test');
  }

  console.log(`   Found target asset: ${parentAsset.code} - ${parentAsset.name} (qty: ${parentAsset.quantity}, total: ${parentAsset.totalSatang / 100} THB, version: ${parentAsset.version})`);

  console.log('3. Submitting request with partial lot split (50 units for repair)...');
  const reqRes = await fetch(`${baseUrl}/api/data`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: cookie || ''
    },
    body: JSON.stringify({
      action: 'request',
      id: parentAsset.id,
      version: parentAsset.version,
      kind: 'repair',
      splitQuantity: 50,
      reason: 'เบาะขาด 50 ตัว ต้องการส่งซ่อมบำรุงเร่งด่วน'
    })
  });

  const reqResult = await reqRes.json();
  if (!reqRes.ok || !reqResult.ok) {
    throw new Error(`Request submission failed: ${JSON.stringify(reqResult)}`);
  }
  console.log('   Request submitted successfully:', reqResult);

  console.log('4. Verifying database state after split and request creation...');
  const afterRes = await fetch(`${baseUrl}/api/data`, {
    headers: { cookie: cookie || '' }
  });
  const afterData = await afterRes.json();

  const oldParent = afterData.assets.find(a => a.id === parentAsset.id);
  console.log(`   Parent asset status: lifecycle=${oldParent.lifecycle}, version=${oldParent.version}`);
  if (oldParent.lifecycle !== 'split') {
    throw new Error(`Expected parent lifecycle to be 'split', got '${oldParent.lifecycle}'`);
  }

  const child50 = afterData.assets.find(a => a.parentId === parentAsset.id && a.quantity === 50);
  const child150 = afterData.assets.find(a => a.parentId === parentAsset.id && a.quantity === 150);

  if (!child50) throw new Error('Target child (50 units) not found');
  if (!child150) throw new Error('Remainder child (150 units) not found');

  console.log(`   Child 1 (50 units): code=${child50.code}, qty=${child50.quantity}, totalSatang=${child50.totalSatang} (${child50.totalSatang / 100} THB), lifecycle=${child50.lifecycle}, version=${child50.version}`);
  console.log(`   Child 2 (150 units): code=${child150.code}, qty=${child150.quantity}, totalSatang=${child150.totalSatang} (${child150.totalSatang / 100} THB), lifecycle=${child150.lifecycle}, version=${child150.version}`);

  const pendingReq = afterData.requests.find(r => r.assetId === child50.id);
  if (!pendingReq) {
    throw new Error('Pending request on 50-unit child asset not found');
  }
  console.log(`   Pending request created on child 1: id=${pendingReq.id}, kind=${pendingReq.kind}, status=${pendingReq.status}, reason='${pendingReq.reason}'`);

  const auditEvents = afterData.events.slice(0, 3);
  console.log('   Recent Audit events:');
  for (const ev of auditEvents) {
    console.log(`   - [${ev.action}] by ${ev.actorName}: ${ev.reason}`);
  }

  console.log('\n✅ ALL VERIFICATION CHECKS PASSED PERFECTLY!');
}

main().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
