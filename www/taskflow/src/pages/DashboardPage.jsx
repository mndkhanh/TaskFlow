import { useBoardData } from "../context/BoardDataContext";
import Sidebar from "../components/layout/Sidebar";
import DashboardHeader from "../components/layout/DashboardHeader";
import BoardTile from "../components/board/BoardTile";
import Icon from "../components/ui/Icon";

export default function DashboardPage() {
  const { boards, workspacesLoading, workspacesError } = useBoardData();

  if (workspacesLoading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center text-sm"
        style={{ background: "var(--bg)", color: "var(--text-2)" }}
      >
        Loading your workspace…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader />
        <div className="flex-1 overflow-y-auto" style={{ padding: "32px 28px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            {workspacesError && (
              <div
                className="text-sm"
                style={{
                  marginBottom: 20,
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "var(--danger-soft)",
                  color: "var(--danger-2)",
                }}
              >
                Couldn’t load your workspaces: {workspacesError}
              </div>
            )}
            <div className="flex items-baseline justify-between" style={{ marginBottom: 20 }}>
              <h1 className="text-2xl font-extrabold tracking-tight" style={{ margin: 0 }}>Your boards</h1>
              <span className="text-sm" style={{ color: "var(--text-3)" }}>{boards.length} boards</span>
            </div>
            <div className="grid gap-4.5" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(248px,1fr))" }}>
              {boards.map((board) => (
                <BoardTile key={board.id} board={board} />
              ))}
              <button
                type="button"
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl hover:border-[var(--primary)] hover:text-[var(--primary)]"
                style={{ border: "2px dashed var(--border-2)", background: "none", minHeight: 190, color: "var(--text-3)" }}
              >
                <Icon name="add" size={28} />
                <span className="text-sm font-semibold">Create new board</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
