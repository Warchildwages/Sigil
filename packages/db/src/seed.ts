import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding Signet database...');

  // Create demo entity
  const demoCorp = await prisma.entity.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Signet Demo Corp',
      type: 'corporation',
      walletAddress: '0x0000000000000000000000000000000000000000',
    },
  });
  console.log(`Created entity: ${demoCorp.name}`);

  // Create CEO role
  const ceoRole = await prisma.role.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      entityId: demoCorp.id,
      name: 'CEO',
      permissions: ['sign', 'attest', 'witness'],
    },
  });
  console.log(`Created role: ${ceoRole.name}`);

  // Create officeholder
  const officeholder = await prisma.officeholder.upsert({
    where: { id: '00000000-0000-0000-0000-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000003',
      roleId: ceoRole.id,
      walletAddress: '0x0000000000000000000000000000000000000000',
      displayName: 'Demo User',
      termStart: new Date('2026-01-01'),
      termEnd: null,
    },
  });
  console.log(`Created officeholder: ${officeholder.displayName}`);

  // Create sample NDA document
  const document = await prisma.document.upsert({
    where: { id: '00000000-0000-0000-0000-000000000004' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000004',
      title: 'Mutual Non-Disclosure Agreement',
      contentHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      mimeType: 'application/pdf',
      status: 'draft',
      privacyMode: 'public',
      chainId: 84532,
      createdByEntityId: demoCorp.id,
    },
  });
  console.log(`Created document: ${document.title}`);

  console.log('✅ Seed complete.');
}

seed()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });