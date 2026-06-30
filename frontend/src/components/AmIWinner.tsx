"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import {
  useZamaSDK,
  useDecryptValues,
  useHasPermit,
  useGrantPermit,
} from "@zama-fhe/react-sdk";
import { sealedVickreyABI } from "@/lib/abi";
import { SEALED_VICKREY_ADDRESS } from "@/lib/config";

export function AmIWinner() {
  const sdk = useZamaSDK();
  const { address } = useAccount();
  const [auctionId, setAuctionId] = useState("");
  const [encryptedHandle, setEncryptedHandle] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Permit gating — avoid unsolicited wallet popups
  const { data: hasPermit } = useHasPermit({
    contractAddresses: [SEALED_VICKREY_ADDRESS],
  });
  const { mutate: grantPermit, isPending: isGranting } = useGrantPermit();

  // Only decrypt if we have a handle and permits
  const { data: decrypted } = useDecryptValues(
    encryptedHandle
      ? [{ encryptedValue: encryptedHandle, contractAddress: SEALED_VICKREY_ADDRESS }]
      : [],
    { enabled: !!encryptedHandle && !!hasPermit },
  );

  async function handleCheck() {
    if (!address || !auctionId) return;
    setError(null);
    setEncryptedHandle(null);
    setIsChecking(true);

    try {
      // Read the encrypted isWinner handle from the contract
      const handle = (await sdk.provider.readContract({
        address: SEALED_VICKREY_ADDRESS,
        abi: sealedVickreyABI,
        functionName: "amIWinner",
        args: [BigInt(auctionId)],
      })) as string;

      setEncryptedHandle(handle);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check failed");
    } finally {
      setIsChecking(false);
    }
  }

  const result =
    encryptedHandle && decrypted
      ? (decrypted as Record<string, bigint | boolean | string>)[encryptedHandle]
      : undefined;
  const isWinner = result === true || result === BigInt(1);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <h2 className="text-lg font-semibold mb-4">Did I Win? (Private Check)</h2>
      <p className="text-sm text-zinc-400 mb-4">
        After settle, check privately whether you won. Only you learn the result
        — via EIP-712 user decryption. No one else can see your winner status.
      </p>
      <div className="flex gap-3 mb-3">
        <input
          type="number"
          placeholder="Auction ID"
          value={auctionId}
          onChange={(e) => setAuctionId(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm focus:border-indigo-500 outline-none"
        />
        <button
          onClick={handleCheck}
          disabled={isChecking || !address || !auctionId}
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition-colors disabled:opacity-50 text-sm font-medium whitespace-nowrap"
        >
          {isChecking ? "Checking..." : "Check"}
        </button>
      </div>

      {/* Permit gate */}
      {encryptedHandle && !hasPermit && (
        <button
          onClick={() => grantPermit([SEALED_VICKREY_ADDRESS])}
          disabled={isGranting}
          className="w-full px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 transition-colors text-sm font-medium mb-3"
        >
          {isGranting
            ? "Sign in wallet..."
            : "Sign to decrypt your result (one-time)"}
        </button>
      )}

      {result !== undefined && (
        <p
          className={`text-lg font-semibold ${isWinner ? "text-green-400" : "text-zinc-400"}`}
        >
          {isWinner ? "You won the auction!" : "You did not win."}
        </p>
      )}
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </div>
  );
}
