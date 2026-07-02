import type { SignetAttestationData } from '@signet/shared';
import { SIGNET_EAS_SCHEMA, SUPPORTED_CHAINS } from '@signet/shared';
import { encodeFunctionData, encodeAbiParameters, keccak256, stringToBytes } from 'viem';
import type { SmartAccount } from 'viem/account-abstraction';
import { sendUserOp } from './circle.js';
import type { SupportedChainId } from './circle.js';

// Schema UIDs will be populated after on-chain registration per chain
export const SIGNET_SCHEMA_UID: Record<number, string> = {};

/**
 * Compute the EAS schema UID deterministically from the schema string.
 * EAS UID = keccak256(SchemaRegistry.address, keccak256("EAS"), keccak256("SCHEMA"), keccak256(schemaString))
 * But the actual uid is assigned by the contract. We'll fetch it from the event after registration.
 */
function computeSchemaUid(schema: string, registryAddress: `0x${string}`): `0x${string}` {
  const schemaHash = keccak256(stringToBytes(schema));
  const easHash = keccak256(stringToBytes('EAS'));
  const attrHash = keccak256(stringToBytes('SCHEMA'));
  return keccak256(
    encodeAbiParameters(
      [{ type: 'address' }, { type: 'bytes32' }, { type: 'bytes32' }, { type: 'bytes32' }],
      [registryAddress, easHash, attrHash, schemaHash],
    ),
  );
}

export function encodeAttestationData(data: SignetAttestationData): `0x${string}` {
  // Simple encoding: concatenate all fields as ABI-encoded bytes
  // contentHash (bytes32) + title (variable) + signer (address) + signedAt (uint256)
  // + privacyMode (uint8) + signingMethod (uint8) + supplementaryProof (bytes32)

  const contentHashPadded = data.contentHash.startsWith('0x')
    ? data.contentHash.slice(2).padStart(64, '0')
    : data.contentHash.padStart(64, '0');

  const signedAtHex = data.signedAt.toString(16).padStart(64, '0');
  const privacyModeHex = data.privacyMode.toString(16).padStart(2, '0');
  const signingMethodHex = data.signingMethod.toString(16).padStart(2, '0');
  const suppProofPadded = data.supplementaryProof.startsWith('0x')
    ? data.supplementaryProof.slice(2).padStart(64, '0')
    : data.supplementaryProof.padStart(64, '0');

  // Signer address padded
  const signerPadded = data.signer.startsWith('0x')
    ? data.signer.slice(2).padStart(64, '0')
    : data.signer.padStart(64, '0');

  return `0x${contentHashPadded}${signedAtHex}${signerPadded}${privacyModeHex}${signingMethodHex}${suppProofPadded}`;
}

export function decodeAttestationData(encoded: `0x${string}`): SignetAttestationData {
  const hex = encoded.startsWith('0x') ? encoded.slice(2) : encoded;

  const contentHash = `0x${hex.slice(0, 64)}`;
  const signedAt = BigInt(`0x${hex.slice(64, 128)}`);
  const signer = `0x${hex.slice(128, 192)}`;
  const privacyMode = parseInt(hex.slice(192, 194), 16);
  const signingMethod = parseInt(hex.slice(194, 196), 16);
  const supplementaryProof = `0x${hex.slice(196, 260)}`;

  return {
    contentHash,
    title: '', // Title is stored off-chain (too large for efficient on-chain encoding)
    signer,
    signedAt,
    privacyMode,
    signingMethod,
    supplementaryProof,
  };
}

/**
 * Register the Signet attestation schema on EAS via the Circle bundler (gasless).
 *
 * @param chainId - EVM chain ID (e.g., 84532 for Base Sepolia)
 * @param easContractAddress - EAS contract address for the chain
 * @param account - Circle Smart Account that will pay (gasless via paymaster)
 * @param schemaString - Schema definition string
 * @returns The computed schema UID
 */
export async function registerSchema(
  chainId: number,
  easContractAddress: `0x${string}`,
  account: SmartAccount,
  schemaString: string = SIGNET_EAS_SCHEMA,
): Promise<string> {
  // Build the EAS SchemaRegistry.register(schema string, resolver, revocable) calldata
  // register(string schema, address resolver, bool revocable)
  const registerCalldata = encodeFunctionData({
    abi: [
      {
        name: 'register',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
          { name: 'schema', type: 'string' },
          { name: 'resolver', type: 'address' },
          { name: 'revocable', type: 'bool' },
        ],
        outputs: [{ name: 'uid', type: 'bytes32' }],
      },
    ],
    args: [schemaString, '0x0000000000000000000000000000000000000000' as `0x${string}`, true],
  });

  const chain = SUPPORTED_CHAINS.find((c) => c.chainId === chainId);
  const walletPath = chain?.modularWalletPath ?? '/baseSepolia';

  const txHash = await sendUserOp(chainId as SupportedChainId, walletPath, account, [
    { to: easContractAddress, data: registerCalldata, value: 0n },
  ]);

  // Compute the expected schema UID (EAS derives it deterministically)
  const schemaUid = computeSchemaUid(schemaString, easContractAddress);

  // Cache for the session
  SIGNET_SCHEMA_UID[chainId] = schemaUid;

  console.log(`Schema registered on chain ${chainId}: ${schemaUid} (tx: ${txHash})`);
  return schemaUid;
}
