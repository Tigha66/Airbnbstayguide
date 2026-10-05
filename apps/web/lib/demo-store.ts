"use client";
import { useSyncExternalStore } from "react";
import { demoProperties, type Property } from "@stayguide/shared";
export type DemoState = {
  properties: Property[];
  hostName: string;
  organization: string;
  dark: boolean;
  selectedProperty: string;
  replies: Record<string, string[]>;
};
const initial: DemoState = {
  properties: demoProperties,
  hostName: "Alex",
  organization: "The Good Stay",
  dark: false,
  selectedProperty: "casa-serena",
  replies: {},
};
let cached: DemoState = initial;
let loaded = false;
const listeners = new Set<() => void>();
function snapshot() {
  if (!loaded && typeof window !== "undefined") {
    loaded = true;
    try {
      const raw = localStorage.getItem("stayguide-demo-v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          Array.isArray(parsed.properties) &&
          typeof parsed.hostName === "string"
        )
          cached = { ...initial, ...parsed };
      }
    } catch {
      cached = initial;
    }
  }
  return cached;
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function updateDemo(update: Partial<DemoState>) {
  cached = { ...snapshot(), ...update };
  if (live.live) {
    // Real hosts' guides live in the database; only keep UI preferences locally.
    if (demoBackup) {
      demoBackup = { ...demoBackup, dark: cached.dark };
      try {
        localStorage.setItem("stayguide-demo-v1", JSON.stringify(demoBackup));
      } catch {}
    }
    listeners.forEach((l) => l());
    return;
  }
  try {
    localStorage.setItem("stayguide-demo-v1", JSON.stringify(cached));
  } catch {
    /* A private browser can still use the in-memory demo. */
  }
  listeners.forEach((l) => l());
}
export function useDemo() {
  return useSyncExternalStore(subscribe, snapshot, () => initial);
}
export function saveProperty(property: Property) {
  const state = snapshot();
  updateDemo({
    properties: state.properties.some((p) => p.id === property.id)
      ? state.properties.map((p) => (p.id === property.id ? property : p))
      : [...state.properties, property],
  });
  if (live.live) queueSave(property);
}

/* ───────── Live mode: signed-in hosts sync with the Neon-backed API ───────── */
export type LiveUser = { id: string; email: string; name: string | null; image: string | null; plan: string };
export type SyncState = "idle" | "saving" | "saved" | "error";
type LiveState = {
  checked: boolean;
  live: boolean;
  user: LiveUser | null;
  services: { accounts: boolean; ai: boolean };
  sync: SyncState;
};
let live: LiveState = { checked: false, live: false, user: null, services: { accounts: false, ai: false }, sync: "idle" };
const liveListeners = new Set<() => void>();
const setLive = (patch: Partial<LiveState>) => {
  live = { ...live, ...patch };
  liveListeners.forEach((l) => l());
};
const serverLive: LiveState = { checked: false, live: false, user: null, services: { accounts: false, ai: false }, sync: "idle" };
export function useLive() {
  return useSyncExternalStore(
    (l) => {
      liveListeners.add(l);
      return () => {
        liveListeners.delete(l);
      };
    },
    () => live,
    () => serverLive,
  );
}
let demoBackup: DemoState | null = null;
/** Called once by the dashboard. Switches to the host's real data when signed in. */
export async function initLive() {
  if (live.checked) return live;
  try {
    const res = await fetch("/api/v1/me", { cache: "no-store" });
    const me = await res.json();
    if (me.user) {
      demoBackup = snapshot();
      cached = {
        ...demoBackup,
        properties: me.properties ?? [],
        hostName: me.user.name?.split(" ")[0] || me.user.email,
        organization: me.user.name ? `${me.user.name.split(" ")[0]}’s stays` : "My stays",
        selectedProperty: me.properties?.[0]?.id ?? "",
      };
      setLive({ checked: true, live: true, user: me.user, services: me.services });
      listeners.forEach((l) => l());
    } else setLive({ checked: true, services: me.services ?? live.services });
  } catch {
    setLive({ checked: true });
  }
  return live;
}
const timers = new Map<string, ReturnType<typeof setTimeout>>();
function queueSave(property: Property) {
  clearTimeout(timers.get(property.id));
  setLive({ sync: "saving" });
  timers.set(
    property.id,
    setTimeout(async () => {
      timers.delete(property.id);
      try {
        const res = await fetch(`/api/v1/properties/${property.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(property),
        });
        setLive({ sync: res.ok ? (timers.size ? "saving" : "saved") : "error" });
      } catch {
        setLive({ sync: "error" });
      }
    }, 700),
  );
}
export function isLive() {
  return live.live;
}
export async function createLiveProperty(input: { name: string; location: string; description: string }) {
  const res = await fetch("/api/v1/properties", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || "Could not create the property.");
  const property = body.property as Property;
  cached = { ...cached, properties: [...cached.properties, property], selectedProperty: property.id };
  listeners.forEach((l) => l());
  return { property, ai: Boolean(body.ai) };
}
export async function deleteLiveProperty(id: string) {
  const res = await fetch(`/api/v1/properties/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Could not delete the property.");
  const properties = cached.properties.filter((p) => p.id !== id);
  cached = { ...cached, properties, selectedProperty: properties[0]?.id ?? "" };
  listeners.forEach((l) => l());
}
