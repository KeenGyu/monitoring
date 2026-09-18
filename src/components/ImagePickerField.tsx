import { useRef } from "react";
import "./ImagePickerField.css";

interface ImagePickerFieldProps {
  label: string;
  value: string | null;
  onChange: (dataUrl: string | null) => void;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function ImagePickerField({ label, value, onChange }: ImagePickerFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    onChange(dataUrl);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="field">
      <label>{label}</label>
      {value ? (
        <div className="image-picker-preview">
          <img src={value} alt="" />
          <div className="image-picker-actions">
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => inputRef.current?.click()}
            >
              Replace
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => onChange(null)}
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="image-picker-empty"
          onClick={() => inputRef.current?.click()}
        >
          + Upload image
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        style={{ display: "none" }}
      />
    </div>
  );
}
