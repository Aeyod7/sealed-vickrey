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

  const { data: hasPermit } = useHasPermit({
    contractAddresses: [SEALED_VICKREY_ADDRESS],
  });
  const { mutate: grantPermit, isPending: isGranting } = useGrantPermit();

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
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="heading text-base">Did I Win?</h3>
        <span className="text-[11px] text-slate mono">05</span>
      </div>

      <p className="text-[13px] text-fog leading-relaxed">
        After settle, check privately whether you won. Only you learn the result
        via EIP-712 user decryption.
      </p>

      <div className="flex gap-2">
        <input
          type="number"
          placeholder="Auction ID"
          value={auctionId}
          onChange={(e) => setAuctionId(e.target.value)}
          className="input flex-1 px-3 py-2"
        />
        <button
          onClick={handleCheck}
          disabled={isChecking || !address || !auctionId}
          className="btn-secondary px-4 py-2 text-sm whitespace-nowrap"
        >
          {isChecking ? "Checking..." : "Check"}
        </button>
      </div>

      {encryptedHandle && !hasPermit && (
        <button
          onClick={() => grantPermit([SEALED_VICKREY_ADDRESS])}
          disabled={isGranting}
          className="btn-secondary w-full px-4 py-2 text-sm"
        >
          {isGranting
            ? "Sign in wallet..."
            : "Sign to decrypt your result (one-time)"}
        </button>
      )}

      {result !== undefined && (
        <div
          className={`rounded-lg border p-4 text-center ${
            isWinner
              ? "border-emerald/30 bg-emerald/5"
              : "border-graphite bg-obsidian"
          }`}
        >
          <p
            className={`text-lg font-medium tracking-tight ${
              isWinner ? "text-success" : "text-slate"
            }`}
          >
            {isWinner ? "You won the auction" : "You did not win"}
          </p>
        </div>
      )}

      {error && <p className="text-[12px] text-error">{error}</p>}
    </div>
  );
}
