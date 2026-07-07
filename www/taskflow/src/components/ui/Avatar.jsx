export default function Avatar({ initials, color, size = 32, overlap = false, title }) {
  return (
    <span
      title={title}
      className="flex flex-none items-center justify-center rounded-full font-bold text-white"
      style={{
        width: size,
        height: size,
        background: color,
        fontSize: size * 0.36,
        border: overlap ? "2px solid var(--surface)" : "none",
        marginLeft: overlap ? -8 : 0,
      }}
    >
      {initials}
    </span>
  );
}
