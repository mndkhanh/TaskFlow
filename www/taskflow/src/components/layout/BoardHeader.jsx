import { useNavigate } from "react-router-dom";
import { useBoardData } from "../../context/BoardDataContext";
import { useTheme } from "../../context/ThemeContext";
import Avatar from "../ui/Avatar";
import Icon from "../ui/Icon";
import IconButton from "../ui/IconButton";

const TEAM_IDS = ["ava", "marcus", "priya", "diego", "sam"];

export default function BoardHeader({ board, workspaceName }) {
  const { members } = useBoardData();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <header
      className="flex flex-none items-center gap-3.5"
      style={{ height: 60, borderBottom: "1px solid var(--border)", background: "var(--surface)", padding: "0 20px" }}
    >
      <IconButton icon="arrow_back" onClick={() => navigate("/dashboard")} />
      <span className="rounded" style={{ width: 12, height: 12, background: board.color }} />
      <div className="flex-1">
        <div className="text-base font-extrabold tracking-tight leading-tight">{board.name}</div>
        <div className="text-xs" style={{ color: "var(--text-3)" }}>{workspaceName}</div>
      </div>
      <button
        type="button"
        className="flex items-center gap-1.5 rounded-lg text-sm font-semibold cursor-pointer hover:bg-[var(--surface-2)]"
        style={{ height: 36, padding: "0 12px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-2)" }}
      >
        <Icon name="filter_list" size={18} />
        Filter
      </button>
      <div className="flex items-center">
        {TEAM_IDS.map((id) => (
          <Avatar key={id} initials={members[id].initials} color={members[id].color} overlap />
        ))}
      </div>
      <button
        type="button"
        className="flex items-center gap-1.5 rounded-lg text-sm font-bold text-white cursor-pointer hover:bg-[var(--primary-2)]"
        style={{ height: 36, padding: "0 14px", border: "none", background: "var(--primary)" }}
      >
        <Icon name="ios_share" size={18} />
        Share
      </button>
      <IconButton icon={theme === "light" ? "dark_mode" : "light_mode"} size={36} onClick={toggleTheme} />
    </header>
  );
}
