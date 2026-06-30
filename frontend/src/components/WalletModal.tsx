"use client";

import { useConnect } from "wagmi";
import { useAccount } from "wagmi";
import { useEffect } from "react";

export function WalletModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { connectors, connectAsync, isPending } = useConnect();
  const { isConnected } = useAccount();

  useEffect(() => {
    if (isConnected) onClose();
  }, [isConnected, onClose]);

  if (!isOpen) return null;

  const connectorIcons: Record<string, string> = {
    metaMask: "🦊",
    walletConnect: "📱",
    coinbaseWallet: "🅒",
    injected: "🔌",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-onyx/90 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="card w-full max-w-sm p-6 space-y-4 border border-graphite">
        <div className="flex items-center justify-between">
          <h3 className="heading text-base">Connect Wallet</h3>
          <button
            onClick={onClose}
            className="text-slate hover:text-fog transition-colors text-lg"
          >
            ×
          </button>
        </div>

        <p className="text-[13px] text-fog">
          Select a wallet to connect to Sealed.
        </p>

        <div className="space-y-2">
          {connectors.map((connector) => (
            <button
              key={connector.uid}
              onClick={() => connectAsync({ connector })}
              disabled={isPending}
              className="w-full flex items-center gap-3 px-4 py-3 border border-graphite bg-obsidian hover:border-iron hover:bg-steel transition-colors text-left"
            >
              <span className="text-xl">
                {connectorIcons[connector.id] || "🔗"}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-snow">
                  {connector.name}
                </p>
                <p className="text-[11px] text-slate">
                  {connector.id === "injected"
                    ? "Browser extension"
                    : "Wallet connector"}
                </p>
              </div>
              {isPending && <span className="text-xs text-slate">...</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
