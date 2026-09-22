import React, { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

const TOAST_KEY = "aires-bi-pwa-install-toasted";

function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(display-mode: standalone)")?.matches) return true;
  return Boolean(window.navigator.standalone);
}

export function PwaInstallBanner() {
  const deferredPromptRef = useRef(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isPromptAvailable, setIsPromptAvailable] = useState(false);

  useEffect(() => {
    setIsStandalone(isStandaloneDisplay());

    if (!window.localStorage.getItem(TOAST_KEY)) {
      toast("Install Aires-BI for offline field audits", {
        icon: "📱",
        duration: 4000,
      });
      window.localStorage.setItem(TOAST_KEY, "true");
    }

    function handleBeforeInstallPrompt(event) {
      event.preventDefault();
      deferredPromptRef.current = event;
      setIsPromptAvailable(true);
    }

    function handleAppInstalled() {
      deferredPromptRef.current = null;
      setIsPromptAvailable(false);
      setIsStandalone(true);
      setIsDismissed(true);
      setIsInstalling(false);
      toast.success("Aires-BI installed on this device!");
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const shouldShowFallback = !isStandalone && !isDismissed;
  const canPromptNative = isPromptAvailable && Boolean(deferredPromptRef.current);

  const handleInstall = async () => {
    const promptEvent = deferredPromptRef.current;

    if (!promptEvent) {
      toast("Use 'Add to Home Screen' in your browser menu to install Aires-BI.");
      return;
    }

    setIsInstalling(true);
    try {
      promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      deferredPromptRef.current = null;
      setIsPromptAvailable(false);

      if (choice?.outcome === "accepted") {
        toast.success("Aires-BI installation accepted.");
      }
      setIsDismissed(true);
    } catch {
      toast.error("Install prompt failed to initialize.");
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  if (!shouldShowFallback) return null;

  return (
    <div className="fixed inset-x-0 bottom-3 z-50 px-3 sm:bottom-4 sm:px-4 lg:px-8">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3.5 shadow-xl backdrop-blur-md sm:max-w-3xl sm:gap-4 sm:p-4">
        {/* Brand Badge in Aires Red */}
        <div className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-[#A41821] text-white font-black text-lg shadow-xs">
          A
        </div>

        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-sm font-bold text-slate-900">
            Install Aires-BI Field Audit App
          </p>
          <p className="text-xs text-slate-600">
            Enables instant offline competitor pricing entry, GPS tag locks, and background sync.
          </p>
        </div>

        <div className="flex flex-none items-center gap-2">
          <button
            type="button"
            onClick={handleInstall}
            disabled={isInstalling}
            className="rounded-xl bg-[#A41821] hover:bg-[#7F1219] px-4 py-2 text-xs font-bold text-white shadow-xs transition active:scale-95 disabled:opacity-50"
          >
            {canPromptNative ? "Install App" : "Add to Home"}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            aria-label="Dismiss banner"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}