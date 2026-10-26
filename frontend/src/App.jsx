import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import StudentDashboard from "./pages/StudentDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import SecurityDashboard from "./pages/SecurityDashboard";
import HodDashboard from "./pages/HodDashboard";

const ROLE_ROUTES = {
  student: "/student",
  teacher: "/teacher",
  security: "/security",
  hod: "/hod",
};

function RootRedirect() {
  const { isAuthenticated, role } = useAuth();
  if (isAuthenticated && ROLE_ROUTES[role]) {
    return <Navigate to={ROLE_ROUTES[role]} replace />;
  }
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/student"
            element={
              <ProtectedRoute allowedRole="student">
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher"
            element={
              <ProtectedRoute allowedRole="teacher">
                <TeacherDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/security"
            element={
              <ProtectedRoute allowedRole="security">
                <SecurityDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hod"
            element={
              <ProtectedRoute allowedRole="hod">
                <HodDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
