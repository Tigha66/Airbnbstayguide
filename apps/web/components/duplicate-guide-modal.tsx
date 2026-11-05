"use client";
import { useState } from "react";
import { Copy, Check, Loader2 } from "lucide-react";
import { Modal } from "./modal";

interface DuplicateGuideModalProps {
  propertyName: string;
  onDuplicate: (newName: string) => Promise<void>;
  onClose: () => void;
  tr: (key: string, params?: Record<string, any>) => string;
}

export function DuplicateGuideModal({
  propertyName,
  onDuplicate,
  onClose,
  tr,
}: DuplicateGuideModalProps) {
  const [newName, setNewName] = useState(`${propertyName} (Copy)`);
  const [duplicating, setDuplicating] = useState(false);
  const [error, setError] = useState("");

  async function handleDuplicate() {
    if (!newName.trim()) {
      setError(tr("Please enter a name for the new guide."));
      return;
    }

    setDuplicating(true);
    setError("");

    try {
      await onDuplicate(newName);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : tr("Could not duplicate the guide."));
    } finally {
      setDuplicating(false);
    }
  }

  return (
    <Modal
      title={tr("Duplicate this guide")}
      close={onClose}
      closeLabel={tr("Close dialog")}
    >
      <p>
        {tr("Create an exact copy of {name} with all sections and settings.", {
          name: propertyName,
        })}
      </p>

      <div className="form-grid" style={{ marginTop: 20 }}>
        <label>
          {tr("New guide name")}
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxLength={120}
            autoFocus
          />
        </label>

        {error && <p className="error-text">{error}</p>}

        <div className="row" style={{ gap: 12, marginTop: 12 }}>
          <button
            type="button"
            onClick={handleDuplicate}
            disabled={duplicating}
            className="button"
          >
            {duplicating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {tr("Duplicating…")}
              </>
            ) : (
              <>
                <Copy size={16} />
                {tr("Duplicate guide")}
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="button secondary"
          >
            {tr("Cancel")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
