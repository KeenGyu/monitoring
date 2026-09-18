import { useRef, useState } from "react";
import { useApp } from "../store";
import { Modal } from "../components/Modal";
import { ConfirmDialog } from "../components/ConfirmDialog";
import type { ExportBundle } from "../types";
import { formatDateTime } from "../lib/dates";
import "./DataPage.css";

function isExportBundle(value: unknown): value is ExportBundle {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    Array.isArray(v.reports) &&
    Array.isArray(v.activity) &&
    typeof v.settings === "object" &&
    v.settings !== null
  );
}

export function DataPage() {
  const { reports, activity, exportData, importData, clearAllData } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pendingImport, setPendingImport] = useState<ExportBundle | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState("");
  const [justExported, setJustExported] = useState(false);

  function handleExport() {
    const bundle = exportData();
    const blob = new Blob([JSON.stringify(bundle, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `qms-work-monitor-backup-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setJustExported(true);
    setTimeout(() => setJustExported(false), 2500);
  }

  function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (!isExportBundle(parsed)) {
          setImportError("That file doesn't look like a QMS Work Monitor backup.");
          return;
        }
        setPendingImport(parsed);
      } catch {
        setImportError("Couldn't read that file — make sure it's a valid JSON export.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function confirmImport() {
    if (!pendingImport) return;
    importData(pendingImport);
    setPendingImport(null);
  }

  function confirmClear() {
    clearAllData();
    setShowClearModal(false);
    setClearConfirmText("");
  }

  const proofCount = reports.filter((r) => r.proofImage).length;

  return (
    <div className="page">
      <header className="page-header">
        <h1>Data</h1>
        <p className="page-subtitle">
          Everything lives in this browser — back it up before you clear a cache or switch
          devices.
        </p>
      </header>

      <section className="data-section card">
        <div className="data-section-body">
          <h3>Current data</h3>
          <p className="data-hint">
            {reports.length} {reports.length === 1 ? "report" : "reports"} ·{" "}
            {activity.length} activity {activity.length === 1 ? "entry" : "entries"} ·{" "}
            {proofCount} proof {proofCount === 1 ? "image" : "images"}
          </p>
        </div>
      </section>

      <section className="data-section card">
        <div className="data-section-body">
          <h3>Export data</h3>
          <p className="data-hint">
            Download everything — reports, activity history, proof images, and settings — as a
            single JSON file you can keep as a backup.
          </p>
        </div>
        <div className="data-section-actions">
          <button className="btn btn-primary" onClick={handleExport}>
            {justExported ? "Downloaded ✓" : "Export to JSON"}
          </button>
        </div>
      </section>

      <section className="data-section card">
        <div className="data-section-body">
          <h3>Import data</h3>
          <p className="data-hint">
            Restore from a backup file. This will replace whatever is currently in the app, so
            you'll be asked to confirm first.
          </p>
          {importError ? <p className="data-error">{importError}</p> : null}
        </div>
        <div className="data-section-actions">
          <button className="btn btn-ghost" onClick={() => fileInputRef.current?.click()}>
            Choose file…
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            style={{ display: "none" }}
            onChange={handleFileChosen}
          />
        </div>
      </section>

      <section className="data-section card danger-section">
        <div className="data-section-body">
          <h3>Clear all data</h3>
          <p className="data-hint">
            Permanently deletes every report, activity entry, and proof image from this browser.
            This cannot be undone.
          </p>
        </div>
        <div className="data-section-actions">
          <button className="btn btn-danger" onClick={() => setShowClearModal(true)}>
            Clear all data
          </button>
        </div>
      </section>

      {pendingImport ? (
        <ConfirmDialog
          title="Replace current data?"
          message={`This backup was exported ${formatDateTime(
            pendingImport.exportedAt
          )} and contains ${pendingImport.reports.length} report(s). Importing it will replace everything currently in the app. This can't be undone.`}
          confirmLabel="Replace data"
          onConfirm={confirmImport}
          onCancel={() => setPendingImport(null)}
        />
      ) : null}

      {showClearModal ? (
        <Modal
          title="Clear all data"
          subtitle="This permanently deletes everything on this device."
          onClose={() => {
            setShowClearModal(false);
            setClearConfirmText("");
          }}
          width={440}
        >
          <p className="data-hint" style={{ marginBottom: 14 }}>
            Type <strong>DELETE</strong> to confirm. There's no undo — export a backup first if
            you're not sure.
          </p>
          <div className="field">
            <input
              type="text"
              value={clearConfirmText}
              onChange={(e) => setClearConfirmText(e.target.value)}
              placeholder="DELETE"
              autoFocus
            />
          </div>
          <div className="modal-footer">
            <button
              className="btn btn-ghost"
              onClick={() => {
                setShowClearModal(false);
                setClearConfirmText("");
              }}
            >
              Cancel
            </button>
            <button
              className="btn btn-danger"
              disabled={clearConfirmText.trim() !== "DELETE"}
              onClick={confirmClear}
            >
              Delete everything
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
