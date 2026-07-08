import { useEffect, useState } from "react";

export default function Avatar({ initials, color, size = 32, overlap = false, title, src }) {
  // Fall back to initials if the image is missing or fails to load.
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);

  const base = {
    width: size,
    height: size,
    border: overlap ? "2px solid var(--surface)" : "none",
    marginLeft: overlap ? -8 : 0,
  };

  if (src && !broken) {
    return (
      <img
        src={src}
        alt={title || ""}
        title={title}
        onError={() => setBroken(true)}
        className="flex-none rounded-full object-cover"
        style={{ ...base, background: color }}
      />
    );
  }

  return (
    <span
      title={title}
      className="flex flex-none items-center justify-center rounded-full font-bold text-white"
      style={{ ...base, background: color, fontSize: size * 0.36 }}
    >
      {initials}
    </span>
  );
}
