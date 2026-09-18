import { useState } from "react";
import type { ActivityEvent, Report } from "../types";
import { Modal } from "./Modal";
import { StatusBadge } from "./StatusBadge";
import { ImageViewerModal } from "./ImageViewerModal";
import { displayStatus } from "../lib/status";
import { formatDate, formatDateTime, formatTimeAgo } from "../lib/dates";
import "./ReportDetailModal.css";

interface ReportDetailModalProps {
  report: Report;
  activity: ActivityEvent[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRemoveProof: () => void;
}

export function ReportDetailModal({
  report,
  activity,
  onClose,
  onEdit,
  onDelete,
  onRemoveProof,
}: ReportDetailModalProps) {
  const [viewingImage, setViewingImage] = useState<"proof" | "reaction" | null>(null);
  const status = displayStatus(report);
  const history = activity.filter((a) => a.reportId === report.id);

  return (
    <>
      <Modal title={report.name} subtitle={report.category || undefined} onClose={onClose} width={600}>
        <div className="detail-status-row">
          <StatusBadge status={status} />
          {report.submittedAt ? (
            <span className="detail-muted">Submitted {formatDateTime(report.submittedAt)}</span>
          ) : null}
        </div>

        {report.description ? (
          <p className="detail-description">{report.description}</p>
        ) : null}

        <div className="detail-grid">
          <div>
            <div className="detail-label">Due</div>
            <div className="detail-value">{formatDate(report.dueDate)}</div>
          </div>
          <div>
            <div className="detail-label">Supervisor</div>
            <div className="detail-value">{report.supervisor || "\u2014"}</div>
          </div>
          <div>
            <div className="detail-label">Monitoring period</div>
            <div className="detail-value">
              {report.monitoringStart || report.monitoringEnd
                ? `${formatDate(report.monitoringStart)} \u2013 ${formatDate(report.monitoringEnd)}`
                : "\u2014"}
            </div>
          </div>
          <div>
            <div className="detail-label">Created</div>
            <div className="detail-value">{formatDate(report.createdAt.slice(0, 10))}</div>
          </div>
        </div>

        <div className="detail-section">
          <div className="detail-label">Proof</div>
          {report.proofImage ? (
            <button className="proof-thumb" onClick={() => setViewingImage("proof")}>
              <img src={report.proofImage} alt="Submission proof" />
              <span>View submission proof</span>
            </button>
          ) : (
            <p className="detail-muted">No proof attached.</p>
          )}
        </div>

        {report.submissionNotes ? (
          <div className="detail-section">
            <div className="detail-label">Notes</div>
            <p className="detail-value">{report.submissionNotes}</p>
          </div>
        ) : null}

        {report.funnyReactionImage ? (
          <div className="detail-section">
            <div className="detail-label">Funny reaction</div>
            <button className="proof-thumb" onClick={() => setViewingImage("reaction")}>
              <img src={report.funnyReactionImage} alt="Funny reaction" />
              <span>View reaction image</span>
            </button>
          </div>
        ) : null}

        <div className="detail-section">
          <div className="detail-label">Activity history</div>
          {history.length === 0 ? (
            <p className="detail-muted">No activity recorded yet.</p>
          ) : (
            <ul className="detail-history">
              {history.map((event) => (
                <li key={event.id}>
                  <span className="detail-history-time">{formatTimeAgo(event.timestamp)}</span>
                  <span>{event.message}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-danger" onClick={onDelete}>
            Delete
          </button>
          <button className="btn btn-ghost" onClick={onEdit}>
            Edit
          </button>
          <button className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </Modal>

      {viewingImage === "proof" && report.proofImage ? (
        <ImageViewerModal
          src={report.proofImage}
          title="Submission proof"
          onClose={() => setViewingImage(null)}
          onRemove={onRemoveProof}
        />
      ) : null}

      {viewingImage === "reaction" && report.funnyReactionImage ? (
        <ImageViewerModal
          src={report.funnyReactionImage}
          title="Funny reaction"
          onClose={() => setViewingImage(null)}
        />
      ) : null}
    </>
  );
}
