"use client";

import { Button } from "@repo/ui/button";
import { XIcon } from "@repo/ui/icons";
import Image from "next/image";
import { useState, useSyncExternalStore } from "react";
import { Panel } from "../_ui/parts";

/** Chrome's install prompt, which the browser holds until the page asks. */
type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

declare global {
  interface Window {
    /** Kept by `INSTALL_PROMPT_SCRIPT` when it fired before this mounted. */
    __installPrompt?: InstallPrompt;
  }
}

const DISMISSED_KEY = "connect:install-dismissed";
/** "Not now" holds this long before the card asks again. */
const QUIET_MS = 30 * 24 * 60 * 60 * 1000;

/** Opened from the home screen already, Android's or the iPhone's. */
function standalone() {
  return (
    matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** An iPhone or iPad, the iPad's desktop Safari too: no install prompt, Add to Home Screen instead. */
function apple() {
  return (
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function dismissedLately() {
  try {
    const at = Number(localStorage.getItem(DISMISSED_KEY));
    return Number.isFinite(at) && Date.now() - at < QUIET_MS;
  } catch {
    return false;
  }
}

/** What the card offers now: the browser's install, the iPhone's steps, or nothing. */
function installOffer(): "prompt" | "apple" | null {
  if (installed || standalone() || dismissedLately()) return null;
  if (window.__installPrompt) return "prompt";
  return apple() ? "apple" : null;
}

/** Installed in this visit: the card goes. */
let installed = false;

/** The browser offering the install, late, or the app installed. */
function subscribe(onChange: () => void) {
  const onPrompt = (event: Event) => {
    event.preventDefault();
    window.__installPrompt = event as InstallPrompt;
    onChange();
  };
  const onInstalled = () => {
    installed = true;
    window.__installPrompt = undefined;
    onChange();
  };
  addEventListener("beforeinstallprompt", onPrompt);
  addEventListener("appinstalled", onInstalled);
  return () => {
    removeEventListener("beforeinstallprompt", onPrompt);
    removeEventListener("appinstalled", onInstalled);
  };
}

/**
 * "Install Connect" on the home screen, so a driver opens it like an app:
 * the browser's install where it offers one (Android, desktop Chrome and
 * Edge), the iPhone's two steps where it does not. Not shown once opened
 * from the home screen, in a browser that installs nothing, or for a
 * month after "Not now".
 */
export function InstallApp() {
  const shown = useSyncExternalStore(subscribe, installOffer, () => null);
  // "Not now" or a prompt used: hidden until the next visit, or longer.
  const [closed, setClosed] = useState(false);
  if (!shown || closed) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {
      // Private mode: it asks again next time.
    }
    setClosed(true);
  };

  const install = async () => {
    const prompt = window.__installPrompt;
    if (!prompt) return;
    // A prompt is used once: the browser offers it again on a later visit.
    window.__installPrompt = undefined;
    await prompt.prompt();
    await prompt.userChoice;
    setClosed(true);
  };

  return (
    <Panel className="flex items-start gap-4 p-4">
      <Image
        src="/pwa/icon-192.png"
        alt=""
        width={48}
        height={48}
        className="size-12 shrink-0 rounded-control ring-1 ring-edge"
      />
      <div className="grid min-w-0 flex-1 gap-2">
        <div className="grid gap-0.5">
          <h2 className="text-sm font-bold text-ink">Install Connect</h2>
          <p className="text-sm text-body">
            {shown === "apple"
              ? "Tap Share in Safari, then Add to Home Screen. Connect opens from there like an app."
              : "Add it to your home screen and open your jobs like an app."}
          </p>
        </div>
        {shown === "prompt" ? (
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={install}>
              Install
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={dismiss}>
              Not now
            </Button>
          </div>
        ) : null}
      </div>
      {shown === "apple" ? (
        <button
          type="button"
          onClick={dismiss}
          aria-label="Not now"
          className="-m-1 rounded-control p-1 text-muted hover:text-ink focus-ring"
        >
          <XIcon className="size-4" />
        </button>
      ) : null}
    </Panel>
  );
}
