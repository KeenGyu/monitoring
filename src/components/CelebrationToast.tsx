import { useEffect } from "react";
import "./CelebrationToast.css";

interface CelebrationToastProps {
  reportName: string;
  message: string;
  onDismiss: () => void;
}

export function CelebrationToast({ reportName, message, onDismiss }: CelebrationToastProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4200);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className="celebration-toast" role="status">
      <div className="celebration-icon">🎉</div>
      <div>
        <div className="celebration-title">{reportName} submitted</div>
        <div className="celebration-message">{message}</div>
      </div>
      <button className="celebration-close" onClick={onDismiss} aria-label="Dismiss">
        ✕
      </button>
    </div>
  );
}
