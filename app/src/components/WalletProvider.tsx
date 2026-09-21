"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

const BASE_SEPOLIA_CHAIN_ID = 84532;
const BASE_SEPOLIA_HEX = "0x14a34";

type WalletCtxType = {
  address: string | null;
  chainId: number | null;
  isCorrectChain: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchToBaseSepolia: () => Promise<void>;
};

const WalletCtx = createContext<WalletCtxType>({
  address: null,
  chainId: null,
  isCorrectChain: false,
  connect: async () => {},
  disconnect: () => {},
  switchToBaseSepolia: async () => {},
});

function getEthereum(): { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);

  const isCorrectChain = chainId === BASE_SEPOLIA_CHAIN_ID;

  const syncChain = useCallback(async () => {
    const eth = getEthereum();
    if (!eth) return;
    try {
      const id = (await eth.request({ method: "eth_chainId" })) as string;
      setChainId(parseInt(id, 16));
    } catch {}
  }, []);

  const switchToBaseSepolia = useCallback(async () => {
    const eth = getEthereum();
    if (!eth) throw new Error("No wallet installed — install MetaMask/Rabby");
    try {
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: BASE_SEPOLIA_HEX }] });
      setChainId(BASE_SEPOLIA_CHAIN_ID);
    } catch (err: unknown) {
      const e = err as { code?: number };
      if (e.code === 4902) {
        await eth.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: BASE_SEPOLIA_HEX,
              chainName: "Base Sepolia",
              nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
              rpcUrls: ["https://sepolia.base.org"],
              blockExplorerUrls: ["https://sepolia.basescan.org"],
            },
          ],
        });
        setChainId(BASE_SEPOLIA_CHAIN_ID);
      } else {
        throw err;
      }
    }
  }, []);

  const connect = useCallback(async () => {
    const eth = getEthereum();
    if (!eth) {
      alert("No wallet found — install MetaMask or Rabby and refresh");
      return;
    }
    const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
    if (accounts[0]) {
      setAddress(accounts[0]);
      await syncChain();
      // Auto-switch to Base Sepolia for RAAC demo
      const current = (await eth.request({ method: "eth_chainId" }) as string);
      if (parseInt(current, 16) !== BASE_SEPOLIA_CHAIN_ID) {
        try { await switchToBaseSepolia(); } catch {}
      }
    }
  }, [syncChain, switchToBaseSepolia]);

  const disconnect = useCallback(() => setAddress(null), []);

  useEffect(() => {
    const eth = getEthereum();
    if (!eth) return;
    // Restore if already connected
    eth.request({ method: "eth_accounts" }).then((accs) => {
      const a = (accs as string[])[0];
      if (a) setAddress(a);
    }).catch(() => {});
    syncChain();
    const onAccounts = (accs: unknown) => {
      const a = (accs as string[])[0] ?? null;
      setAddress(a);
    };
    const onChain = (id: unknown) => {
      setChainId(parseInt(id as string, 16));
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (eth as any).on?.("accountsChanged", onAccounts);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (eth as any).on?.("chainChanged", onChain);
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (eth as any).removeListener?.("accountsChanged", onAccounts);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (eth as any).removeListener?.("chainChanged", onChain);
    };
  }, [syncChain]);

  return (
    <WalletCtx.Provider value={{ address, chainId, isCorrectChain, connect, disconnect, switchToBaseSepolia }}>
      {children}
    </WalletCtx.Provider>
  );
}

export function useWallet() {
  return useContext(WalletCtx);
}
