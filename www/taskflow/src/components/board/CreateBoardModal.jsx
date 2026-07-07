import { useRef, useState } from "react";
import { useBoardData } from "../../context/BoardDataContext";
import Icon from "../ui/Icon";

export default function CreateBoardModal({ onClose }) {
  const { createBoard, updateBoardBanner, setBoardBannerUrl } = useBoardData();
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bannerMode, setBannerMode] = useState("upload"); // "upload" | "url"
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [bannerUrl, setBannerUrl] = useState("");
  const bannerInputRef = useRef(null);

  const pickBanner = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  };

  const clearBanner = () => {
    setBannerFile(null);
    setBannerPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return setError("Please enter a board name.");

    setError("");
    setSubmitting(true);
    const { data, error: createError } = await createBoard(trimmed);
    if (createError) {
      setSubmitting(false);
      return setError(createError.message);
    }
    // Best-effort: a failed banner shouldn't block board creation.
    if (data?.id) {
      if (bannerMode === "url" && bannerUrl.trim()) await setBoardBannerUrl(data.id, bannerUrl);
      else if (bannerMode === "upload" && bannerFile) await updateBoardBanner(data.id, bannerFile);
    }
    setSubmitting(false);
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto"
      style={{ background: "rgba(10,15,25,0.55)", backdropFilter: "blur(2px)", padding: "80px 20px", animation: "tf-fade .12s ease" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full overflow-hidden rounded-2xl"
        style={{ maxWidth: 440, background: "var(--surface)", boxShadow: "var(--shadow-lg)", animation: "tf-pop .16s ease" }}
      >
        <div className="flex items-start gap-3.5" style={{ padding: "22px 26px", borderBottom: "1px solid var(--border)" }}>
          <Icon name="dashboard" size={22} style={{ color: "var(--text-3)", marginTop: 2 }} />
          <div className="flex-1">
            <div className="text-xl font-extrabold tracking-tight" style={{ lineHeight: 1.25 }}>Create board</div>
            <div className="text-sm" style={{ color: "var(--text-3)", marginTop: 3 }}>
              It’ll be added to your active workspace.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center rounded-lg cursor-pointer hover:bg-[var(--surface-3)]"
            style={{ width: 36, height: 36, border: "none", background: "var(--surface-2)", color: "var(--text-2)" }}
          >
            <Icon name="close" />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "22px 26px 26px" }}>
          <label className="block text-sm font-semibold" style={{ marginBottom: 7 }}>
            Board name
          </label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={80}
            placeholder="e.g. Mobile App v2.0"
            className="w-full rounded-lg text-sm outline-none focus:border-[var(--primary)]"
            style={{ height: 46, padding: "0 14px", border: "1px solid var(--border-2)", background: "var(--surface)", color: "var(--text)" }}
          />

          <div className="flex items-center justify-between" style={{ margin: "18px 0 7px" }}>
            <div className="text-sm font-semibold">
              Banner <span style={{ color: "var(--text-3)", fontWeight: 400 }}>(optional)</span>
            </div>
            <div
              className="flex items-center"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: 2, gap: 2 }}
            >
              {[
                { key: "upload", label: "Upload" },
                { key: "url", label: "URL" },
              ].map((opt) => {
                const active = bannerMode === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setBannerMode(opt.key)}
                    className="rounded-md text-xs font-semibold cursor-pointer"
                    style={{
                      height: 26,
                      padding: "0 10px",
                      border: "none",
                      background: active ? "var(--surface)" : "transparent",
                      color: active ? "var(--text)" : "var(--text-3)",
                      boxShadow: active ? "var(--shadow)" : "none",
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
          <input ref={bannerInputRef} type="file" accept="image/*" onChange={pickBanner} style={{ display: "none" }} />
          {bannerMode === "url" ? (
            <>
              <input
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                placeholder="https://…/image.jpg"
                className="w-full rounded-lg text-sm outline-none focus:border-[var(--primary)]"
                style={{ height: 46, padding: "0 14px", border: "1px solid var(--border-2)", background: "var(--surface)", color: "var(--text)" }}
              />
              {bannerUrl.trim() && (
                <div className="relative overflow-hidden rounded-lg" style={{ height: 96, marginTop: 10, border: "1px solid var(--border-2)" }}>
                  <img
                    src={bannerUrl}
                    alt="Banner preview"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                    onLoad={(e) => {
                      e.currentTarget.style.display = "block";
                    }}
                  />
                </div>
              )}
            </>
          ) : bannerPreview ? (
            <div className="relative overflow-hidden rounded-lg" style={{ height: 96, border: "1px solid var(--border-2)" }}>
              <img src={bannerPreview} alt="Banner preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <button
                type="button"
                onClick={clearBanner}
                title="Remove banner"
                className="absolute flex items-center justify-center rounded-md cursor-pointer"
                style={{ top: 8, right: 8, width: 28, height: 28, border: "none", background: "rgba(0,0,0,0.5)", color: "#fff" }}
              >
                <Icon name="close" size={18} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => bannerInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold cursor-pointer hover:border-[var(--primary)] hover:text-[var(--primary)]"
              style={{ height: 96, border: "2px dashed var(--border-2)", background: "none", color: "var(--text-3)" }}
            >
              <Icon name="image" size={20} />
              Upload a banner image
            </button>
          )}

          {error && (
            <div
              className="text-sm"
              style={{ marginTop: 16, padding: "10px 12px", borderRadius: 8, background: "var(--danger-soft)", color: "var(--danger-2)" }}
            >
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2.5" style={{ marginTop: 22 }}>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg text-sm font-bold cursor-pointer hover:bg-[var(--surface-2)]"
              style={{ height: 42, padding: "0 18px", border: "1px solid var(--border-2)", background: "var(--surface)", color: "var(--text)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg text-sm font-bold text-white cursor-pointer hover:bg-[var(--primary-2)] disabled:cursor-not-allowed disabled:opacity-60"
              style={{ height: 42, padding: "0 18px", border: "none", background: "var(--primary)" }}
            >
              {submitting ? "Creating…" : "Create board"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
