"use client";
import type { ActivityEntry } from "@stayguide/shared";
import { getActivityIcon, getActivityLabel } from "@/lib/activity-helpers";

interface ActivityFeedProps {
  entries: ActivityEntry[];
  tr: (key: string, params?: Record<string, any>) => string;
}

export function ActivityFeed({ entries, tr }: ActivityFeedProps) {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return tr("just now");
    if (minutes < 60) return tr("{n} minutes ago", { n: minutes });
    if (hours < 24) return tr("{n} hours ago", { n: hours });
    if (days < 7) return tr("{n} days ago", { n: days });
    return date.toLocaleDateString();
  };

  return (
    <div className="activity-feed">
      <h3>{tr("Recent activity")}</h3>
      {entries.length === 0 ? (
        <div className="empty-state">
          <p>{tr("No activity yet")}</p>
        </div>
      ) : (
        <div className="activity-list">
          {entries.slice(0, 10).map((entry) => (
            <div key={entry.id} className="activity-item">
              <div className="activity-icon">
                {getActivityIcon(entry.action)}
              </div>
              <div className="activity-content">
                <strong>{getActivityLabel(entry.action, entry.resourceType, tr)}</strong>
                <small className="activity-meta">
                  {formatTime(entry.timestamp)}
                </small>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
