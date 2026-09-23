import React, { useEffect, useState } from "react";
import { initPwaPrompts } from "./pwaPrompts.js";

function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.matchMedia?.("(display-mode: fullscreen)")?.matches ||
    Boolean(window.navigator?.standalone)
  );
}

export function PwaInstallBanner() {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [canPromptNative, setCanPromptNative] = useState(false);

  useEffect(() => {
    setIsStandalone(isStandaloneDisplay());

    // Check if install prompt was captured at page load
    if (initPwaPrompts.getDeferredPrompt()) {
      setCanPromptNative(true);
    }

    const handlePromptAvailable = () => {
      setCanPromptNative(true);
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setCanPromptNative(false);
      initPwaPrompts.clearDeferredPrompt();
    };

    window.addEventListener("aires:install-prompt-available", handlePromptAvailable);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("aires:install-prompt-available", handlePromptAvailable);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // One-click direct installation without instructions or extra popups
  const handleDirectInstall = async () => {
    const promptEvent = initPwaPrompts.getDeferredPrompt();

    if (promptEvent) {
      setIsInstalling(true);
      try {
        await promptEvent.prompt();
        await promptEvent.userChoice;
        initPwaPrompts.clearDeferredPrompt();
        setCanPromptNative(false);
        setIsDismissed(true);
      } catch {
        // Handled silently
      } finally {
        setIsInstalling(false);
      }
    } else {
      // If already installed or browser handles launch directly
      window.open("/", "_self");
    }
  };

  if (isStandalone || isDismissed) return null;

  return (
    <aside
      aria-label="Install Application"
      className="fixed inset-x-3 bottom-3 z-50 sm:bottom-4 sm:left-auto sm:right-4 sm:max-w-sm animate-in fade-in slide-in-from-bottom-3"
    >
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3.5 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <img
            src="/aires-logo.svg"
            alt="Aires Logo"
            className="h-10 w-10 flex-none rounded-xl bg-white p-1 border border-slate-100 shadow-2xs object-contain"
          />
          <div className="min-w-0">
            <p className="text-sm font-black text-slate-900 leading-tight truncate">
              Aires-BI
            </p>
            <p className="text-xs text-slate-500 truncate">
              Install for field price collection
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-none">
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            ✕
          </button>
          <button
            type="button"
            onClick={handleDirectInstall}
            disabled={isInstalling}
            className="rounded-xl bg-[#A41821] hover:bg-[#7F1219] px-4 py-2 text-xs font-bold text-white shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {isInstalling ? "Installing..." : "Install"}
          </button>
        </div>
      </div>
    </aside>
  );
}