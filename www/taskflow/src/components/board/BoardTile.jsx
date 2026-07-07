import { useNavigate } from "react-router-dom";
import { useBoardData } from "../../context/BoardDataContext";
import Avatar from "../ui/Avatar";
import Icon from "../ui/Icon";

export default function BoardTile({ board }) {
  const { members } = useBoardData();
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(`/board/${board.id}`)}
      className="cursor-pointer overflow-hidden rounded-2xl text-left transition-transform hover:-translate-y-0.5"
      style={{ border: "1px solid var(--border)", background: "var(--surface)", boxShadow: "var(--shadow)", padding: 0 }}
    >
      <div
        className="relative"
        style={
          board.image
            ? { height: 82, backgroundImage: `url("${board.image}")`, backgroundSize: "cover", backgroundPosition: "center" }
            : { height: 82, background: board.gradient }
        }
      >
        {board.archived && (
          <span
            className="absolute rounded-md text-xs font-bold text-white"
            style={{ top: 10, right: 10, background: "rgba(0,0,0,0.35)", padding: "3px 8px" }}
          >
            ARCHIVED
          </span>
        )}
      </div>
      <div style={{ padding: "14px 16px 16px" }}>
        <div className="text-sm font-bold" style={{ marginBottom: 4 }}>{board.name}</div>
        <div className="text-xs" style={{ color: "var(--text-3)", marginBottom: 14 }}>
          {board.cardCount} cards · updated today
        </div>
        <div className="flex items-center justify-between">
          <div className="flex">
            {board.avatars.map((id) =>
              members[id] ? (
                <Avatar key={id} initials={members[id].initials} color={members[id].color} size={26} overlap />
              ) : null
            )}
          </div>
          <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-3)" }}>
            <Icon name="credit_card" size={15} />
            {board.cardCount}
          </span>
        </div>
      </div>
    </button>
  );
}
