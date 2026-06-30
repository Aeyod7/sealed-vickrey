"use client";

import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connectors, connectAsync, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="w-32 h-9 rounded-lg border border-graphite bg-charcoal animate-pulse" />
    );
  }

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-graphite bg-charcoal">
          <div className="w-2 h-2 rounded-full bg-emerald" />
          <span className="mono text-xs text-fog">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
        </div>
        <button
          onClick={() => disconnect()}
          className="text-xs text-slate hover:text-fog transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {connectors.map((connector) => (
        <button
          key={connector.uid}
          onClick={() => connectAsync({ connector })}
          disabled={isPending}
          className="btn-primary px-4 py-2 text-sm"
        >
          {isPending ? "Connecting..." : "Connect Wallet"}
        </button>
      ))}
    </div>
  );
}
