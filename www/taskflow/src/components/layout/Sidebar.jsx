import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import WorkspaceSwitcher from "./WorkspaceSwitcher";
import Icon from "../ui/Icon";

const NAV_ITEMS = [
  { icon: "home", label: "Home" },
  { icon: "group", label: "Members" },
  { icon: "settings", label: "Settings" },
];

export default function Sidebar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside
      className="flex flex-none flex-col"
      style={{
        width: 264,
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
        padding: "20px 14px",
      }}
    >
      <div
        className="flex items-center gap-2.5"
        style={{ padding: "4px 8px 20px" }}
      >
        <div
          className="relative flex-none rounded-lg"
          style={{ width: 30, height: 30, background: "var(--primary)" }}
        >
          <div
            className="absolute rounded-sm bg-white"
            style={{ left: 6, top: 6, width: 5, height: 18 }}
          />
          <div
            className="absolute rounded-sm"
            style={{
              left: 13,
              top: 6,
              width: 5,
              height: 11,
              background: "#8fc0f0",
            }}
          />
          <div
            className="absolute rounded-sm"
            style={{
              left: 20,
              top: 6,
              width: 5,
              height: 14,
              background: "var(--danger)",
            }}
          />
        </div>
        <span className="text-lg font-extrabold tracking-tight">
          SRT TaskFlow
        </span>
      </div>

      <WorkspaceSwitcher />

      <div
        style={{ height: 1, background: "var(--border)", margin: "16px 8px" }}
      />
      <div
        className="text-xs font-bold"
        style={{
          color: "var(--text-3)",
          letterSpacing: "0.06em",
          padding: "0 8px",
          marginBottom: 8,
        }}
      >
        GENERAL
      </div>
      {NAV_ITEMS.map((item) => (
        <button
          key={item.label}
          type="button"
          className="flex w-full items-center gap-2.5 rounded-lg text-sm font-medium cursor-pointer hover:bg-[var(--surface-2)]"
          style={{
            padding: "9px 8px",
            border: "none",
            background: "none",
            color: "var(--text-2)",
          }}
        >
          <Icon name={item.icon} />
          {item.label}
        </button>
      ))}

      <div className="flex-1" />
      <button
        type="button"
        onClick={handleLogout}
        className="flex w-full items-center gap-2.5 rounded-lg text-sm font-medium cursor-pointer hover:bg-[var(--surface-2)]"
        style={{
          padding: "9px 8px",
          border: "none",
          background: "none",
          color: "var(--text-2)",
        }}
      >
        <Icon name="logout" />
        Log out
      </button>
    </aside>
  );
}
