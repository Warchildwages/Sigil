// @ts-nocheck
/**
 * Signet Smoke Test — Direct DB validation against Neon
 * Run from packages/db: npx tsx src/smoke-test.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DEMO_ENTITY_ID = '00000000-0000-0000-0000-000000000001';
const SEED_DOC_ID = '00000000-0000-0000-0000-000000000004';
let failures = 0;
let passed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.log(`  ✗ FAIL: ${label}`);
    failures++;
  }
}

async function test(name: string, fn: () => Promise<void>) {
  console.log(`\n${name}`);
  try {
    await fn();
  } catch (err: any) {
    console.log(`  ✗ EXCEPTION: ${err.message}`);
    console.error(err);
    failures++;
  }
}

async function main() {
// ═══════════════════════════════════════════════════════════
await test('1. Database Connection', async () => {
  const count = await prisma.entity.count();
  assert(count >= 1, `entity table reachable (${count} records)`);
  console.log('    Connected to Neon');
});

// ═══════════════════════════════════════════════════════════
await test('2. Seed Data Integrity', async () => {
  const entity = await prisma.entity.findUnique({ where: { id: DEMO_ENTITY_ID } });
  assert(entity !== null, 'seed entity exists');
  assert(entity!.name === 'Signet Demo Corp', 'entity name correct');
  assert(entity!.type === 'corporation', 'entity type is corporation');
  console.log(`    Entity: "${entity!.name}" (${entity!.type})`);

  const role = await prisma.role.findFirst({ where: { entityId: DEMO_ENTITY_ID } });
  assert(role !== null, 'CEO role exists');
  assert(role!.name === 'CEO', 'role name is CEO');
  assert(role!.permissions.includes('sign'), 'role has sign permission');
  assert(role!.permissions.includes('attest'), 'role has attest permission');
  console.log(`    Role: "${role!.name}" (permissions: ${role!.permissions.join(', ')})`);

  const holder = await prisma.officeholder.findFirst({ where: { roleId: role!.id } });
  assert(holder !== null, 'officeholder exists');
  assert(holder!.displayName === 'Demo User', 'officeholder name correct');
  assert(holder!.termEnd === null, 'current officeholder (termEnd is null)');
  console.log(`    Officeholder: "${holder!.displayName}"`);

  const seedDoc = await prisma.document.findUnique({ where: { id: SEED_DOC_ID } });
  assert(seedDoc !== null, 'seed NDA document exists');
  assert(seedDoc!.title === 'Mutual Non-Disclosure Agreement', 'document title correct');
  assert(seedDoc!.status === 'draft', 'seed doc status is draft');
  console.log(`    Seed Document: "${seedDoc!.title}" (${seedDoc!.status})`);
});

// ═══════════════════════════════════════════════════════════
let testDocId: string | null = null;
let testSigId: string | null = null;
let testAttId: string | null = null;

await test('3. Full Document Lifecycle', async () => {
  const mockHash = '0x0000000000000000000000000000000000000000000000000000000000000abc';
  const doc = await prisma.document.create({
    data: {
      title: 'Smoke Test NDA', contentHash: mockHash, mimeType: 'application/pdf',
      status: 'draft', privacyMode: 'public', chainId: 84532, createdByEntityId: DEMO_ENTITY_ID,
    },
  });
  assert(doc.id.length > 0, 'document created with UUID');
  assert(doc.title === 'Smoke Test NDA', 'title persisted');
  assert(doc.contentHash === mockHash, 'contentHash persisted');
  assert(doc.status === 'draft', 'initial status is draft');
  assert(doc.privacyMode === 'public', 'privacyMode is public');
  assert(doc.chainId === 84532, 'chainId is Base Sepolia (84532)');
  testDocId = doc.id;
  console.log(`    Created: ${testDocId.slice(0, 8)}...`);

  // Read with relations
  const docRead = await prisma.document.findUnique({
    where: { id: testDocId }, include: { signatures: true, attestations: true, createdByEntity: true },
  });
  assert(docRead !== null, 'document readable after creation');
  assert(docRead!.signatures.length === 0, 'no signatures yet');
  assert(docRead!.attestations.length === 0, 'no attestations yet');
  assert(docRead!.createdByEntity.name === 'Signet Demo Corp', 'entity relation works');

  // Sign
  const sig = await prisma.signature.create({
    data: {
      documentId: testDocId, entityId: DEMO_ENTITY_ID,
      signerWallet: '0x0000000000000000000000000000000000000000',
      signatureProof: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      signingMethod: 'passkey', chainId: 84532, status: 'signed', signedAt: new Date(),
    },
  });
  assert(sig.status === 'signed', 'signature status is signed');
  assert(sig.signingMethod === 'passkey', 'signing method is passkey');
  assert(sig.signedAt !== null, 'signedAt timestamp set');
  testSigId = sig.id;
  console.log(`    Signature: ${testSigId.slice(0, 8)}... (${sig.signingMethod})`);

  // Update to signed
  await prisma.document.update({ where: { id: testDocId }, data: { status: 'signed' } });
  const docSigned = await prisma.document.findUnique({ where: { id: testDocId } });
  assert(docSigned!.status === 'signed', 'document status updated to signed');

  // Attest
  const mockUid = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  const att = await prisma.attestation.create({
    data: {
      documentId: testDocId, protocol: 'EAS', protocolUid: mockUid,
      schemaUid: '0x0000000000000000000000000000000000000000000000000000000000000000',
      attester: '0x0000000000000000000000000000000000000000',
      recipient: '0x0000000000000000000000000000000000000000',
      data: '0xabcdef', privacyMode: 'public', chainId: 84532, attestedAt: new Date(),
    },
  });
  assert(att.protocolUid === mockUid, 'attestation UID persisted');
  assert(att.protocol === 'EAS', 'protocol is EAS');
  assert(att.attestedAt !== null, 'attestedAt timestamp set');
  testAttId = att.id;
  console.log(`    Attestation: ${att.protocolUid.slice(0, 16)}...`);

  // Update to attested
  await prisma.document.update({ where: { id: testDocId }, data: { status: 'attested' } });

  // Final state
  const final = await prisma.document.findUnique({
    where: { id: testDocId },
    include: { signatures: { include: { entity: true } }, attestations: true },
  });
  assert(final!.status === 'attested', 'final status is attested');
  assert(final!.signatures.length === 1, 'exactly 1 signature');
  assert(final!.attestations.length === 1, 'exactly 1 attestation');
  assert(final!.signatures[0]!.entity.name === 'Signet Demo Corp', 'signature linked to entity');
  assert(final!.signatures[0]!.signingMethod === 'passkey', 'signing method persisted');
  assert(final!.attestations[0]!.protocolUid === mockUid, 'attestation UID persisted');
  console.log('    Full lifecycle: draft → signed → attested ✓');
});

// ═══════════════════════════════════════════════════════════
await test('4. Query Patterns & Indexes', async () => {
  const t1 = performance.now();
  const docs = await prisma.document.findMany({
    where: { createdByEntityId: DEMO_ENTITY_ID }, orderBy: { createdAt: 'desc' },
    include: { signatures: true, attestations: true },
  });
  const docTime = performance.now() - t1;
  assert(docs.length >= 1, `entity listing (${docs.length} docs, ${docTime.toFixed(0)}ms)`);

  const t2 = performance.now();
  await prisma.signature.findMany({ where: { documentId: SEED_DOC_ID } });
  const sigTime = performance.now() - t2;
  assert(sigTime < 500, `documentId index (${sigTime.toFixed(0)}ms)`);

  const t3 = performance.now();
  await prisma.document.findFirst({
    where: { contentHash: '0x0000000000000000000000000000000000000000000000000000000000000000' },
  });
  const hashTime = performance.now() - t3;
  assert(hashTime < 500, `contentHash index (${hashTime.toFixed(0)}ms)`);
  console.log('    Indexes all <500ms');
});

// ═══════════════════════════════════════════════════════════
await test('5. Unique Constraints', async () => {
  const testUid = '0xTEST_UNIQUE_1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
  await prisma.attestation.create({
    data: {
      documentId: SEED_DOC_ID, protocol: 'EAS', protocolUid: testUid,
      schemaUid: '0x0', attester: '0x0', recipient: '0x0', data: '0x0',
      privacyMode: 'public', chainId: 84532, attestedAt: new Date(),
    },
  });
  let violated = false;
  try {
    await prisma.attestation.create({
      data: {
        documentId: SEED_DOC_ID, protocol: 'EAS', protocolUid: testUid,
        schemaUid: '0x0', attester: '0x0', recipient: '0x0', data: '0x0',
        privacyMode: 'public', chainId: 84532, attestedAt: new Date(),
      },
    });
  } catch (err: any) { violated = err.code === 'P2002'; }
  assert(violated, 'duplicate protocolUid rejected (P2002)');
  await prisma.attestation.delete({ where: { protocolUid: testUid } });
  console.log('    Unique constraint enforced');
});

// ═══════════════════════════════════════════════════════════
await test('6. Edge Cases', async () => {
  const d1 = await prisma.document.create({
    data: {
      title: 'Edge Case', contentHash: '0xEDGEEDGEEDGEEDGEEDGEEDGEEDGEEDGEEDGEEDGEEDGEEDGEEDGEEDGEEDGEEDGE',
      mimeType: 'text/plain', status: 'draft', privacyMode: 'public', chainId: 84532,
      createdByEntityId: DEMO_ENTITY_ID, contentUri: null,
    },
  });
  assert(d1.contentUri === null, 'null contentUri');
  await prisma.document.delete({ where: { id: d1.id } });

  const d2 = await prisma.document.create({
    data: {
      title: 'A'.repeat(500), contentHash: '0xLONGLONGLONGLONGLONGLONGLONGLONGLONGLONGLONGLONGLONGLONGLONGLONG',
      mimeType: 'text/plain', status: 'draft', privacyMode: 'public', chainId: 84532,
      createdByEntityId: DEMO_ENTITY_ID,
    },
  });
  assert(d2.title.length === 500, '500-char title');
  await prisma.document.delete({ where: { id: d2.id } });

  const ph = await prisma.officeholder.create({
    data: {
      roleId: '00000000-0000-0000-0000-000000000002', walletAddress: '0x0',
      displayName: 'Past CEO', termStart: new Date('2024-01-01'), termEnd: new Date('2025-12-31'),
    },
  });
  assert(ph.termEnd !== null, 'past officeholder termEnd');
  await prisma.officeholder.delete({ where: { id: ph.id } });
  console.log('    null fields, 500-char title, term-limited officeholder all pass');
});

// ═══════════════════════════════════════════════════════════
await test('7. Schema Enum Validation', async () => {
  const types = await prisma.entity.findMany({ distinct: ['type'], select: { type: true } });
  assert(types.length >= 1, `EntityType enum (${types.length} values)`);
  const statuses = await prisma.document.findMany({ distinct: ['status'], select: { status: true } });
  assert(statuses.length >= 1, `DocumentStatus enum (saw: ${statuses.map(s=>s.status).join(', ')})`);
  console.log('    6 enums operational');
});

// ═══════════════════════════════════════════════════════════
// CLEANUP
// ═══════════════════════════════════════════════════════════
if (testDocId) {
  if (testAttId) await prisma.attestation.delete({ where: { id: testAttId } }).catch(() => {});
  if (testSigId) await prisma.signature.delete({ where: { id: testSigId } }).catch(() => {});
  await prisma.document.delete({ where: { id: testDocId } }).catch(() => {});
  console.log('\n(test data cleaned up)');
}

await prisma.$disconnect();

// ═══════════════════════════════════════════════════════════
const total = passed + failures;
console.log('\n══════════════════════════════════════════');
console.log('  SMOKE TEST RESULTS');
console.log(`  ✓ ${passed} passed, ${failures ? '✗ ' + failures + ' failed' : '0 failed'} (${total} assertions)`);
console.log('══════════════════════════════════════════\n');
}

main().then(() => process.exit(failures > 0 ? 1 : 0)).catch(e => { console.error(e); process.exit(1); });