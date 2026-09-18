import { useState } from "react";
import { Modal } from "./Modal";
import "./ImageViewerModal.css";

interface ImageViewerModalProps {
  src: string;
  title: string;
  onClose: () => void;
  onRemove?: () => void;
}

export function ImageViewerModal({ src, title, onClose, onRemove }: ImageViewerModalProps) {
  const [zoomed, setZoomed] = useState(false);

  return (
    <Modal title={title} onClose={onClose} width={640}>
      <div className={`image-viewer ${zoomed ? "zoomed" : ""}`}>
        <img
          src={src}
          alt={title}
          onClick={() => setZoomed((z) => !z)}
          title={zoomed ? "Click to zoom out" : "Click to zoom in"}
        />
      </div>
      <div className="modal-footer">
        {onRemove ? (
          <button
            className="btn btn-danger"
            onClick={() => {
              onRemove();
              onClose();
            }}
          >
            Remove image
          </button>
        ) : null}
        <button className="btn btn-primary" onClick={onClose}>
          Done
        </button>
      </div>
    </Modal>
  );
}
