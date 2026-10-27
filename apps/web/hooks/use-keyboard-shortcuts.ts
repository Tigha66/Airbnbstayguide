import { useEffect, useState } from "react";

interface KeyboardShortcut {
  keys: string;
  description: string;
  action: () => void;
}

/**
 * Hook for managing keyboard shortcuts in the editor.
 * Handles: Cmd/Ctrl+S (save), Escape (close), etc.
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't trigger when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        if ((e.ctrlKey || e.metaKey) && e.key === "s") {
          e.preventDefault();
          shortcuts.find((s) => s.keys === "mod+s")?.action();
        }
        return;
      }

      // Escape to close dialogs
      if (e.key === "Escape") {
        setHelpOpen(false);
      }

      // Check for other shortcuts
      shortcuts.forEach((shortcut) => {
        const isMatch =
          (shortcut.keys === "mod+s" && (e.ctrlKey || e.metaKey) && e.key === "s") ||
          (shortcut.keys === "mod+d" && (e.ctrlKey || e.metaKey) && e.key === "d") ||
          (shortcut.keys === "?" && e.key === "?" && !e.ctrlKey && !e.metaKey);

        if (isMatch) {
          e.preventDefault();
          shortcut.action();
        }
      });
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);

  return { helpOpen, setHelpOpen };
}

/**
 * Pre-configured shortcuts for guide editor
 */
export const editorShortcuts = (tr: (key: string) => string) => [
  {
    keys: "Cmd/Ctrl+S",
    label: tr("Save guide"),
    description: tr("All changes are saved automatically, but you can trigger a save."),
  },
  {
    keys: "Escape",
    label: tr("Close modals"),
    description: tr("Press Escape to close any open dialog or modal."),
  },
  {
    keys: "Tab",
    label: tr("Focus next section"),
    description: tr("Navigate between sections in the editor."),
  },
  {
    keys: "Shift+Tab",
    label: tr("Focus previous section"),
    description: tr("Navigate backwards through sections."),
  },
  {
    keys: "↑ / ↓",
    label: tr("Reorder selected section"),
    description: tr("Move section up or down in the list."),
  },
  {
    keys: "?",
    label: tr("Show keyboard help"),
    description: tr("Display this keyboard shortcuts reference."),
  },
];
