import { NextResponse } from 'next/server';

export async function POST() {
  const verifications = [
    { contract: 'SimpleEscrow.sol', verified: true, score: 92, issues: [] },
    { contract: 'MultiSigWallet.sol', verified: true, score: 88, issues: ['moderate: unused owner'] },
    { contract: 'FlashLoan.sol', verified: false, score: 45, issues: ['critical: reentrancy on line 72', 'high: unchecked call return'] },
    { contract: 'NFTAuction.sol', verified: true, score: 76, issues: ['low: missing event emission'] },
  ];

  return NextResponse.json({
    demo: true,
    description: 'Validator Agent — contract verification & trust scoring simulation',
    agent: 'Validator ✅',
    verifications,
    summary: {
      total: verifications.length,
      verified: verifications.filter(v => v.verified).length,
      faulty: verifications.filter(v => !v.verified).length,
      averageScore: Math.round(verifications.reduce((s, v) => s + v.score, 0) / verifications.length),
    },
    operations: ['verify', 'prove', 'status'],
  });
}
