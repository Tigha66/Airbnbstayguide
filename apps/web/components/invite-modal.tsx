"use client";
import { useState } from "react";
import { Mail, Loader2 } from "lucide-react";
import { Modal } from "./modal";
import type { TeamRole } from "@stayguide/shared";

interface InviteModalProps {
  onInvite: (email: string, role: TeamRole) => Promise<void>;
  onClose: () => void;
  tr: (key: string, params?: Record<string, any>) => string;
}

export function InviteModal({ onInvite, onClose, tr }: InviteModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("editor");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleInvite() {
    if (!email.trim()) {
      setError(tr("Please enter an email address."));
      return;
    }

    if (!email.includes("@")) {
      setError(tr("Please enter a valid email address."));
      return;
    }

    setInviting(true);
    setError("");

    try {
      await onInvite(email, role);
      setSuccess(tr("Invitation sent to {email}", { email }));
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : tr("Could not send invitation.")
      );
    } finally {
      setInviting(false);
    }
  }

  return (
    <Modal
      title={tr("Invite a team member")}
      close={onClose}
      closeLabel={tr("Close dialog")}
    >
      <p>{tr("Add someone to your team to collaborate on guides.")}</p>

      <div className="form-grid" style={{ marginTop: 20 }}>
        <label>
          {tr("Email address")}
          <div className="input-with-icon">
            <Mail size={16} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={tr("name@example.com")}
              autoFocus
            />
          </div>
        </label>

        <label>
          {tr("Role")}
          <select value={role} onChange={(e) => setRole(e.target.value as TeamRole)}>
            <option value="viewer">
              {tr("Viewer")} - {tr("View only, no editing")}
            </option>
            <option value="editor">
              {tr("Editor")} - {tr("Full editing access")}
            </option>
            <option value="owner">
              {tr("Owner")} - {tr("Full access and team management")}
            </option>
          </select>
        </label>

        {error && <p className="error-text">{error}</p>}
        {success && <p className="success-text">{success}</p>}

        <div className="row" style={{ gap: 12, marginTop: 12 }}>
          <button
            type="button"
            onClick={handleInvite}
            disabled={inviting}
            className="button"
          >
            {inviting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {tr("Sending…")}
              </>
            ) : (
              <>
                <Mail size={16} />
                {tr("Send invitation")}
              </>
            )}
          </button>
          <button type="button" onClick={onClose} className="button secondary">
            {tr("Cancel")}
          </button>
        </div>
      </div>

      <div className="notice" style={{ marginTop: 20 }}>
        {tr(
          "The team member will receive an email invitation. They must accept to join your workspace."
        )}
      </div>
    </Modal>
  );
}
