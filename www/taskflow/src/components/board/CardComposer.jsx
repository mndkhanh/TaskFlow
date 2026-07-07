import { useEffect, useRef } from "react";
import Icon from "../ui/Icon";

export default function CardComposer({ text, onTextChange, onSubmit, onCancel }) {
  const textareaRef = useRef(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
    if (e.key === "Escape") onCancel();
  };

  return (
    <div style={{ padding: "4px 10px 10px" }}>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Enter a title…"
        className="w-full resize-none rounded-lg text-sm outline-none"
        style={{ minHeight: 60, padding: "9px 11px", border: "1px solid var(--primary)", background: "var(--surface)", color: "var(--text)", boxShadow: "var(--shadow)" }}
      />
      <div className="flex gap-2" style={{ marginTop: 7 }}>
        <button
          type="button"
          onClick={onSubmit}
          className="rounded-lg text-sm font-bold text-white cursor-pointer hover:bg-[var(--primary-2)]"
          style={{ height: 34, padding: "0 14px", border: "none", background: "var(--primary)" }}
        >
          Add card
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center justify-center rounded-lg cursor-pointer hover:bg-[var(--surface-3)]"
          style={{ width: 34, height: 34, border: "none", background: "none", color: "var(--text-2)" }}
        >
          <Icon name="close" />
        </button>
      </div>
    </div>
  );
}
