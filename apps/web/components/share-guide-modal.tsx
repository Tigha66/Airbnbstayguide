"use client";
import { useState } from "react";
import { Share2, Copy, Check } from "lucide-react";
import { Modal } from "./modal";

interface ShareGuideModalProps {
  propertySlug: string;
  propertyName: string;
  onClose: () => void;
  tr: (key: string, params?: Record<string, any>) => string;
}

export function ShareGuideModal({
  propertySlug,
  propertyName,
  onClose,
  tr,
}: ShareGuideModalProps) {
  const [copied, setCopied] = useState(false);
  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : "";
  const shareUrl = `${baseUrl}/g/${propertySlug}`;

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
    }
  }

  const welcomeMessage = tr(
    "We're looking forward to welcoming you to {name}! Here's your personal guide with everything you need for a lovely stay: {link}\nSafe travels — see you soon!",
    {
      name: propertyName,
      link: shareUrl,
    }
  );

  return (
    <Modal
      title={tr("Share this guide")}
      close={onClose}
      closeLabel={tr("Close dialog")}
    >
      <p>{tr("Send your guests this link or include it in a welcome message.")}</p>

      <div className="form-grid" style={{ marginTop: 20 }}>
        <label>
          {tr("Guest guide link")}
          <div className="row" style={{ gap: 8 }}>
            <input readOnly value={shareUrl} />
            <button
              type="button"
              onClick={() => copyToClipboard(shareUrl)}
              className="icon-button"
              aria-label={tr("Copy link")}
            >
              {copied ? (
                <Check size={16} style={{ color: "#14b8a6" }} />
              ) : (
                <Copy size={16} />
              )}
            </button>
          </div>
        </label>

        <label>
          {tr("Welcome message")}
          <textarea
            readOnly
            rows={4}
            value={welcomeMessage}
            style={{ resize: "none" }}
          />
        </label>

        <button
          type="button"
          onClick={() => copyToClipboard(welcomeMessage)}
          className="button secondary"
        >
          <Copy size={14} />
          {tr("Copy message")}
        </button>
      </div>

      <div
        className="notice"
        style={{ marginTop: 20 }}
      >
        {tr("Your guests can access this guide on any device. Links are always active.")}
      </div>
    </Modal>
  );
}
