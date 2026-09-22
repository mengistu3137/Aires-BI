import React from "react";
import toast from "react-hot-toast";

let deferredPrompt = null;

export const initPwaPrompts = {
  /**
   * Listen for browser install prompt and store it for on-demand trigger
   */
  listenForInstallPrompt: () => {
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt = e;
      window.dispatchEvent(new CustomEvent("aires:install-prompt-available"));
    });

    window.addEventListener("appinstalled", () => {
      deferredPrompt = null;
      toast.success("Aires-BI installed on this device!", {
        icon: "📱",
      });
    });
  },

  /**
   * Return the cached prompt
   */
  getDeferredPrompt: () => deferredPrompt,

  /**
   * Clear the cached prompt after use
   */
  clearDeferredPrompt: () => {
    deferredPrompt = null;
  },

  /**
   * Show toast prompt when a new PWA service worker version is ready
   * Uses React.createElement to remain valid pure JS
   */
  showUpdateToast: (reloadCallback) => {
    toast(
      (t) =>
        React.createElement(
          "div",
          { className: "flex items-center gap-3" },
          React.createElement(
            "div",
            { className: "flex-1 text-xs" },
            React.createElement(
              "p",
              { className: "font-bold text-slate-900" },
              "Aires-BI Update Available"
            ),
            React.createElement(
              "p",
              { className: "text-slate-500" },
              "A new version of the audit platform is ready."
            )
          ),
          React.createElement(
            "button",
            {
              type: "button",
              onClick: () => {
                toast.dismiss(t.id);
                if (reloadCallback) reloadCallback();
              },
              className:
                "rounded-lg bg-[#A41821] px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#7F1219]",
            },
            "Update"
          )
        ),
      {
        duration: 10000,
        id: "pwa-update-toast",
      }
    );
  },
};