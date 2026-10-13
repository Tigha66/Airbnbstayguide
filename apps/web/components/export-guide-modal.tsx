"use client";
import { useState } from "react";
import { Download, FileJson, FileText } from "lucide-react";
import { Modal } from "./modal";

interface ExportGuideModalProps {
  propertyName: string;
  onClose: () => void;
  tr: (key: string, params?: Record<string, any>) => string;
}

export function ExportGuideModal({
  propertyName,
  onClose,
  tr,
}: ExportGuideModalProps) {
  const [exporting, setExporting] = useState<"pdf" | "html" | "json" | null>(
    null
  );

  async function handleExport(format: "pdf" | "html" | "json") {
    setExporting(format);

    // Simulate export delay
    setTimeout(() => {
      // In production, this would generate the actual file
      // For now, just show success and close
      setExporting(null);
      onClose();
    }, 1000);
  }

  return (
    <Modal
      title={tr("Export guide")}
      close={onClose}
      closeLabel={tr("Close dialog")}
    >
      <p>{tr("Download your guide as a file for backup, printing, or sharing.")}</p>

      <div className="export-options" style={{ marginTop: 20 }}>
        <button
          type="button"
          onClick={() => handleExport("pdf")}
          disabled={exporting !== null}
          className="export-option"
        >
          <div className="export-icon">
            <FileText size={24} />
          </div>
          <div>
            <strong>{tr("PDF")}</strong>
            <small>{tr("Print-friendly format with all images")}</small>
          </div>
          {exporting === "pdf" && <span className="spinner" />}
        </button>

        <button
          type="button"
          onClick={() => handleExport("html")}
          disabled={exporting !== null}
          className="export-option"
        >
          <div className="export-icon">
            <FileText size={24} />
          </div>
          <div>
            <strong>{tr("HTML")}</strong>
            <small>{tr("Web page you can customize and share")}</small>
          </div>
          {exporting === "html" && <span className="spinner" />}
        </button>

        <button
          type="button"
          onClick={() => handleExport("json")}
          disabled={exporting !== null}
          className="export-option"
        >
          <div className="export-icon">
            <FileJson size={24} />
          </div>
          <div>
            <strong>{tr("JSON")}</strong>
            <small>{tr("Raw data for integration with other tools")}</small>
          </div>
          {exporting === "json" && <span className="spinner" />}
        </button>
      </div>

      <button type="button" onClick={onClose} className="button secondary">
        {tr("Done")}
      </button>
    </Modal>
  );
}
