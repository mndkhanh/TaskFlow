export default function Icon({ name, size = 20, className = "", style = {} }) {
  return (
    <span
      className={`material-symbols-rounded ${className}`}
      style={{ fontSize: size, ...style }}
    >
      {name}
    </span>
  );
}
