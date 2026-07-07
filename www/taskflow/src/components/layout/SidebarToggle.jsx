import { useSidebar } from "../../context/SidebarContext";
import Icon from "../ui/Icon";

// The hide/unhide-sidebar control that sits at the far left of every page header,
// just before the workspace name. Icon flips to signal the action it performs.
export default function SidebarToggle() {
  const { collapsed, toggle } = useSidebar();
  return (
    <button
      type="button"
      onClick={toggle}
      title={collapsed ? "Show sidebar" : "Hide sidebar"}
      aria-label={collapsed ? "Show sidebar" : "Hide sidebar"}
      aria-pressed={!collapsed}
      className="flex flex-none items-center justify-center rounded-md cursor-pointer hover:bg-[var(--surface-2)]"
      style={{ width: 32, height: 32, border: "none", background: "none", color: "var(--text-3)" }}
    >
      <Icon name={collapsed ? "left_panel_open" : "left_panel_close"} size={20} />
    </button>
  );
}
