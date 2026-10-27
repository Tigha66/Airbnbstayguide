import type { ActivityEntry } from "@stayguide/shared";
import {
  FileText,
  Gift,
  MessageCircle,
  Users,
  Zap,
  Copy,
  Share2,
  Download,
} from "lucide-react";

/**
 * Helper function to get icon for activity action
 */
export function getActivityIcon(
  action: ActivityEntry["action"]
): React.ReactNode {
  const iconProps = { size: 16 };
  const iconMap: Record<ActivityEntry["action"], React.ReactNode> = {
    create: <FileText {...iconProps} />,
    update: <Zap {...iconProps} />,
    delete: <FileText {...iconProps} />,
    publish: <Share2 {...iconProps} />,
    duplicate: <Copy {...iconProps} />,
    invite: <Users {...iconProps} />,
    remove: <Users {...iconProps} />,
  };
  return iconMap[action];
}

/**
 * Helper function to get human-readable label for activity
 */
export function getActivityLabel(
  action: ActivityEntry["action"],
  resourceType: ActivityEntry["resourceType"],
  tr: (key: string, params?: Record<string, any>) => string
): string {
  const labels: Record<string, Record<string, string>> = {
    create: {
      guide: tr("Created a new guide"),
      extra: tr("Added an extra"),
      member: tr("Added a team member"),
      workspace: tr("Created workspace"),
    },
    update: {
      guide: tr("Updated guide"),
      extra: tr("Updated extra"),
      member: tr("Updated member role"),
      workspace: tr("Updated workspace"),
    },
    delete: {
      guide: tr("Deleted a guide"),
      extra: tr("Deleted an extra"),
      member: tr("Removed a member"),
      workspace: tr("Updated workspace"),
    },
    publish: {
      guide: tr("Published a guide"),
      extra: tr("Published an extra"),
      member: tr(""),
      workspace: tr(""),
    },
    duplicate: {
      guide: tr("Duplicated a guide"),
      extra: tr(""),
      member: tr(""),
      workspace: tr(""),
    },
    invite: {
      guide: tr(""),
      extra: tr(""),
      member: tr("Sent team invitation"),
      workspace: tr(""),
    },
    remove: {
      guide: tr(""),
      extra: tr(""),
      member: tr("Removed team member"),
      workspace: tr(""),
    },
  };

  return labels[action]?.[resourceType] || tr("Activity");
}
