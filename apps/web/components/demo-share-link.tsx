"use client";
import { useEffect, useState } from "react";

export function DemoShareLink({ name, label }: { name: string; label: string }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const address = new URL(window.location.pathname + window.location.search, window.location.origin);
    queueMicrotask(() => setUrl("https://wa.me/?text=" + encodeURIComponent(`${name} — fictional GetStayGuide demonstration: ${address}`)));
  }, [name]);
  return url ? <a href={url} target="_blank" rel="noopener noreferrer">{label}</a> : <span>{label}</span>;
}
