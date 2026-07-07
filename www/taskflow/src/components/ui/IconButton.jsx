import Icon from "./Icon";

export default function IconButton({ icon, onClick, size = 36, iconSize = 20, className = "", ...rest }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-none items-center justify-center rounded-lg border cursor-pointer transition-colors hover:bg-[var(--surface-2)] ${className}`}
      style={{
        width: size,
        height: size,
        border: "1px solid var(--border)",
        background: "var(--surface)",
        color: "var(--text-2)",
      }}
      {...rest}
    >
      <Icon name={icon} size={iconSize} />
    </button>
  );
}
