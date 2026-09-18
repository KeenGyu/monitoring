import { useState } from "react";
import type { Report } from "./types";
import { useApp } from "./store";
import { Sidebar, MobileHeader, MobileTabBar, type Page } from "./components/Sidebar";
import { Dashboard } from "./pages/Dashboard";
import { ReportsPage } from "./pages/ReportsPage";
import { MonitoringPage } from "./pages/MonitoringPage";
import { ActivityPage } from "./pages/ActivityPage";
import { DataPage } from "./pages/DataPage";
import { AddReportModal } from "./components/AddReportModal";
import { SubmitModal } from "./components/SubmitModal";
import { ReportDetailModal } from "./components/ReportDetailModal";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { CelebrationToast } from "./components/CelebrationToast";
import "./App.css";

type ModalState =
  | { kind: "none" }
  | { kind: "add" }
  | { kind: "edit"; report: Report }
  | { kind: "submit"; report: Report }
  | { kind: "detail"; report: Report }
  | { kind: "delete"; report: Report };

interface ToastState {
  reportName: string;
  message: string;
}

function App() {
  const { reports, activity, addReport, editReport, deleteReport, submitReport, removeProof, loading } =
    useApp();
  const [page, setPage] = useState<Page>("dashboard");
  const [modal, setModal] = useState<ModalState>({ kind: "none" });
  const [toast, setToast] = useState<ToastState | null>(null);

  // Always read the live copy of whichever report a modal points at, so
  // edits made in one modal are reflected if another modal reopens it.
  function liveReport(report: Report): Report {
    return reports.find((r) => r.id === report.id) ?? report;
  }

  function closeModal() {
    setModal({ kind: "none" });
  }

  function handleOpenReport(report: Report) {
    setModal({ kind: "detail", report });
  }

  function handleEditReport(report: Report) {
    setModal({ kind: "edit", report });
  }

  function handleSubmitReport(report: Report) {
    setModal({ kind: "submit", report });
  }

  if (loading) {
    return (
      <div className="app-loading">
        <div className="app-loading-mark">◈</div>
        <p>Loading your reports…</p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar current={page} onNavigate={setPage} />

      <div className="main-column">
        <MobileHeader />
        {page === "dashboard" && (
          <Dashboard onAddReport={() => setModal({ kind: "add" })} onOpenReport={handleOpenReport} />
        )}
        {page === "reports" && (
          <ReportsPage
            onAddReport={() => setModal({ kind: "add" })}
            onOpenReport={handleOpenReport}
            onEditReport={handleEditReport}
            onSubmitReport={handleSubmitReport}
          />
        )}
        {page === "monitoring" && <MonitoringPage onOpenReport={handleOpenReport} />}
        {page === "activity" && <ActivityPage />}
        {page === "data" && <DataPage />}
      </div>

      <MobileTabBar current={page} onNavigate={setPage} />

      {modal.kind === "add" && (
        <AddReportModal
          onSave={(input) => {
            addReport(input);
            closeModal();
          }}
          onClose={closeModal}
        />
      )}

      {modal.kind === "edit" && (
        <AddReportModal
          initial={liveReport(modal.report)}
          onSave={(input) => {
            editReport(modal.report.id, input);
            closeModal();
          }}
          onClose={closeModal}
        />
      )}

      {modal.kind === "submit" && (
        <SubmitModal
          report={liveReport(modal.report)}
          onSubmit={(input) => {
            const message = submitReport(modal.report.id, input);
            const name = modal.report.name;
            closeModal();
            setToast({ reportName: name, message });
          }}
          onClose={closeModal}
        />
      )}

      {modal.kind === "detail" && (
        <ReportDetailModal
          report={liveReport(modal.report)}
          activity={activity}
          onClose={closeModal}
          onEdit={() => setModal({ kind: "edit", report: liveReport(modal.report) })}
          onDelete={() => setModal({ kind: "delete", report: liveReport(modal.report) })}
          onRemoveProof={() => removeProof(modal.report.id)}
        />
      )}

      {modal.kind === "delete" && (
        <ConfirmDialog
          title="Delete report?"
          message={`This permanently removes "${modal.report.name}" and its submission history. This can't be undone.`}
          confirmLabel="Delete"
          onConfirm={() => {
            deleteReport(modal.report.id);
            closeModal();
          }}
          onCancel={closeModal}
        />
      )}

      {toast && (
        <CelebrationToast
          reportName={toast.reportName}
          message={toast.message}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default App;