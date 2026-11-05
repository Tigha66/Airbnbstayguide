"use client";
import { useState } from "react";
import { Plus, Trash2, Loader2, Copy } from "lucide-react";
import type { Webhook } from "@stayguide/shared";
import { Modal } from "./modal";

interface WebhookSettingsProps {
  webhooks: Webhook[];
  onAdd: (url: string, events: string[]) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onToggle: (id: string, active: boolean) => Promise<void>;
  tr: (key: string, params?: Record<string, any>) => string;
}

const webhookEvents = [
  { id: "guide.published", label: "Guide published" },
  { id: "extra.purchased", label: "Extra purchased" },
  { id: "question.escalated", label: "Question escalated" },
  { id: "member.joined", label: "Team member joined" },
];

export function WebhookSettings({
  webhooks,
  onAdd,
  onDelete,
  onToggle,
  tr,
}: WebhookSettingsProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([
    "guide.published",
  ]);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  async function handleAdd() {
    if (!url.trim()) {
      setError(tr("Please enter a webhook URL."));
      return;
    }

    if (!url.startsWith("http")) {
      setError(tr("URL must start with http:// or https://"));
      return;
    }

    setAdding(true);
    setError("");

    try {
      await onAdd(url, selectedEvents);
      setUrl("");
      setSelectedEvents(["guide.published"]);
      setShowAddModal(false);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : tr("Could not add webhook.")
      );
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="webhook-settings">
      <div className="settings-header">
        <h3>{tr("Webhooks")}</h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="button small"
          title={tr("Add webhook")}
        >
          <Plus size={14} />
          {tr("Add webhook")}
        </button>
      </div>

      <p className="description">
        {tr("Send real-time notifications to your systems when events occur.")}
      </p>

      {webhooks.length === 0 ? (
        <div className="empty-state">
          <p>{tr("No webhooks configured")}</p>
          <small>{tr("Webhooks will notify your systems of important events.")}</small>
        </div>
      ) : (
        <div className="webhooks-list">
          {webhooks.map((webhook) => (
            <div key={webhook.id} className="webhook-item">
              <div className="webhook-info">
                <div className="webhook-url">{webhook.url}</div>
                <div className="webhook-events">
                  {webhook.events.length} {tr("events")}
                </div>
                {webhook.lastFiredAt && (
                  <small className="webhook-fired">
                    {tr("Last fired: {date}", {
                      date: new Date(webhook.lastFiredAt).toLocaleString(),
                    })}
                  </small>
                )}
              </div>
              <div className="webhook-actions">
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={webhook.active}
                    onChange={(e) => onToggle(webhook.id, e.target.checked)}
                  />
                  <span className={webhook.active ? "on" : "off"} />
                </label>
                <button
                  onClick={() => onDelete(webhook.id)}
                  className="icon-button delete"
                  title={tr("Delete webhook")}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <Modal
          title={tr("Add webhook")}
          close={() => setShowAddModal(false)}
          closeLabel={tr("Close dialog")}
        >
          <p>{tr("Get real-time notifications when events occur.")}</p>

          <div className="form-grid" style={{ marginTop: 20 }}>
            <label>
              {tr("Webhook URL")}
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={tr("https://your-api.example.com/webhooks")}
                autoFocus
              />
            </label>

            <fieldset>
              <legend>{tr("Events to notify")}</legend>
              <div className="checkbox-group">
                {webhookEvents.map((event) => (
                  <label key={event.id} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedEvents.includes(event.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedEvents([...selectedEvents, event.id]);
                        } else {
                          setSelectedEvents(
                            selectedEvents.filter((id) => id !== event.id)
                          );
                        }
                      }}
                    />
                    {tr(event.label)}
                  </label>
                ))}
              </div>
            </fieldset>

            {error && <p className="error-text">{error}</p>}

            <div className="row" style={{ gap: 12, marginTop: 12 }}>
              <button
                onClick={handleAdd}
                disabled={adding}
                className="button"
              >
                {adding ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {tr("Adding…")}
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    {tr("Add webhook")}
                  </>
                )}
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="button secondary"
              >
                {tr("Cancel")}
              </button>
            </div>
          </div>

          <div className="notice" style={{ marginTop: 20 }}>
            {tr(
              "StayGuide will send POST requests to your URL with event data. Your endpoint should respond with 200 OK."
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
