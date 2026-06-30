"use client";

import { useConnect } from "wagmi";
import { useAccount } from "wagmi";
import { useEffect } from "react";

const WalletIcon = ({ id, name }: { id: string; name: string }) => {
  if (id === "metaMask" || name.toLowerCase().includes("metamask")) {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M19.5 2L13 6.5L14.5 3.5L19.5 2Z" fill="#E2761B" stroke="#E2761B" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M4.5 2L11 6.5L9.5 3.5L4.5 2Z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M18.5 16.5L16.5 20L20.5 21.5L22 16.5H18.5Z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 16.5L4.5 20.5L7.5 21.5L6 16.5H2Z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M7.5 10.5L6.5 13.5L10.5 13L10 10.5H7.5Z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M16.5 10.5L17.5 13.5L13.5 13L14 10.5H16.5Z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M16.5 16.5L13.5 15.5L14.5 18.5L16.5 16.5Z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M7.5 16.5L10.5 15.5L9.5 18.5L7.5 16.5Z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 14.5L12 12.5L13.5 13L13 16.5L12 14.5Z" fill="#D7C1B3" stroke="#D7C1B3" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 14.5L12 12.5L10.5 13L11 16.5L12 14.5Z" fill="#D7C1B3" stroke="#D7C1B3" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }
  if (id === "walletConnect") {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M6 10C9 7 15 7 18 10" stroke="#3B99FC" strokeWidth="2" strokeLinecap="round"/>
        <path d="M8 13C10 11 14 11 16 13" stroke="#3B99FC" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="12" cy="17" r="1" fill="#3B99FC"/>
      </svg>
    );
  }
  if (id === "coinbaseWallet" || name.toLowerCase().includes("coinbase")) {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="4" fill="#0052FF"/>
        <circle cx="12" cy="12" r="5" fill="white"/>
      </svg>
    );
  }
  if (name.toLowerCase().includes("brave")) {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#FF4B4B"/>
        <path d="M8 12H16M12 8V16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    );
  }
  if (name.toLowerCase().includes("phantom")) {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#AB9FF2"/>
        <path d="M9 16.5C9 16.5 7.5 15 7.5 12.5C7.5 9 10 7.5 12 7.5C14 7.5 16.5 9 16.5 12.5C16.5 15 15 16.5 15 16.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="12" cy="12" r="2" fill="white"/>
      </svg>
    );
  }
  // Generic wallet icon
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M20 6H4C2.89543 6 2 6.89543 2 8V18C2 19.1046 2.89543 20 4 20H20C21.1046 20 22 19.1046 22 18V8C22 6.89543 21.1046 6 20 6Z" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M20 10H16.5C15.6716 10 15 10.6716 15 11.5V11.5C15 12.3284 15.6716 13 16.5 13H20" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
};

export function WalletModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { connectors, connectAsync, isPending, variables } = useConnect();
  const { isConnected } = useAccount();

  useEffect(() => {
    if (isConnected) onClose();
  }, [isConnected, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end bg-onyx/85 backdrop-blur-sm p-4 pt-20 sm:pt-24 pr-4 sm:pr-6 lg:pr-12"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[360px] bg-charcoal border border-graphite shadow-elevated">
        <div className="flex items-center justify-between px-5 py-4 border-b border-graphite">
          <h3 className="heading text-sm">Connect Wallet</h3>
          <button
            onClick={onClose}
            className="text-slate hover:text-fog transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-2">
          {connectors.map((connector) => {
            const isConnecting = isPending && variables?.connector === connector;
            return (
              <button
                key={connector.uid}
                onClick={() => connectAsync({ connector })}
                disabled={isPending}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-obsidian hover:border-indigo/50 transition-colors border border-transparent group"
              >
                <div className="text-fog group-hover:text-snow transition-colors">
                  <WalletIcon id={connector.id} name={connector.name} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-snow truncate">
                    {connector.name}
                  </p>
                </div>
                {isConnecting && (
                  <span className="text-xs text-slate">Connecting...</span>
                )}
                {!isConnecting && (
                  <span className="text-xs text-slate group-hover:text-acid-lime transition-colors">
                    Connect →
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="px-5 py-3 border-t border-graphite bg-obsidian/30">
          <p className="text-[11px] text-slate text-center">
            New to crypto?{" "}
            <a
              href="https://metamask.io/download/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-fog hover:text-snow transition-colors"
            >
              Install MetaMask
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
