/** Live sync status for the UI (one store, fed by the single socket in client.ts). */
import { create } from "zustand";

/**
 * connecting — opening the socket or waiting for the relay (covers a Render cold start,
 *              which can take up to a minute; local data stays usable meanwhile)
 * live       — hydrated and exchanging changes
 * offline    — several attempts failed; retrying in the background, edits queue locally
 */
export type SyncPhase = "connecting" | "live" | "offline";

export interface SheetsSummary {
  fetchedAt: number;
  tabs: { name: string; rows: number }[];
  hiddenTabs: number;
}

export interface SyncStatus {
  phase: SyncPhase;
  /** Devices connected to the relay, including this one (0 when not live). */
  clients: number;
  /** Local changes the relay hasn't confirmed yet. */
  pending: number;
  /** Relay mode from HYDRATE: 'relay-only' or 'sheets'. */
  mode: string | null;
  /** Bridge state from HYDRATE when mode is 'sheets' (starting | ok | error | hydrating). */
  sheetsState: string | null;
  sheets: SheetsSummary | null;
  lastSyncAt: number | null;
  error: string | null;
}

export const initialSyncStatus: SyncStatus = {
  phase: "connecting",
  clients: 0,
  pending: 0,
  mode: null,
  sheetsState: null,
  sheets: null,
  lastSyncAt: null,
  error: null,
};

export const useSyncStatus = create<SyncStatus>(() => ({ ...initialSyncStatus }));

/** 2–4 word labels (DESIGN_PHILOSOPHY microcopy). */
export function phaseLabel(phase: SyncPhase): string {
  switch (phase) {
    case "live":
      return "Live";
    case "connecting":
      return "Connecting…";
    default:
      return "Offline";
  }
}

export type SyncDisplayTone = "live" | "warn" | "offline" | "error";

export interface SyncDisplay {
  /** Short pill label for Front Desk. */
  label: string;
  tone: SyncDisplayTone;
  /** Longer hover / title text. */
  title: string;
}

/**
 * FIND-05: honest sync pill — Live / Connecting… / Offline, plus Sheets hydrating or error
 * when the relay exposes it. Keeps microcopy short.
 */
export function syncDisplay(status: Pick<SyncStatus, "phase" | "mode" | "sheetsState" | "pending" | "clients" | "error">): SyncDisplay {
  const pendingBit =
    status.pending > 0
      ? ` · ${status.pending} change${status.pending === 1 ? "" : "s"} queued`
      : "";

  if (status.phase === "offline") {
    return {
      label: "Offline",
      tone: "offline",
      title: `Offline — local data stays usable${pendingBit}`,
    };
  }

  if (status.phase === "connecting") {
    return {
      label: "Connecting…",
      tone: "warn",
      title: status.pending
        ? `Reconnecting${pendingBit}`
        : "Waking the server — local data stays usable",
    };
  }

  // live
  if (status.mode === "sheets" && status.sheetsState === "error") {
    return {
      label: "Sheets error",
      tone: "error",
      title: "Sheets bridge error — edits stay on this device until the bridge recovers. Tap for Cloud settings.",
    };
  }
  if (
    status.mode === "sheets" &&
    (status.sheetsState === "starting" || status.sheetsState === "hydrating")
  ) {
    return {
      label: "Loading sheet…",
      tone: "warn",
      title: "Relay is loading the sheet — local data stays usable. Tap for Cloud settings.",
    };
  }

  const devices =
    status.clients > 0
      ? ` · ${status.clients} device${status.clients === 1 ? "" : "s"}`
      : "";
  return {
    label: "Live",
    tone: "live",
    title: `Live${devices}${pendingBit || ""}`,
  };
}
