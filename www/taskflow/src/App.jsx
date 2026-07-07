import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { BoardDataProvider } from "./context/BoardDataContext";
import { SidebarProvider } from "./context/SidebarContext";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import BoardPage from "./pages/BoardPage";
import InboxPage from "./pages/InboxPage";

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BoardDataProvider>
          <SidebarProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route element={<ProtectedRoute />}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/inbox" element={<InboxPage />} />
                  <Route path="/board/:boardId" element={<BoardPage />} />
                </Route>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </BrowserRouter>
          </SidebarProvider>
        </BoardDataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
