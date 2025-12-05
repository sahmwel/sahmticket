// src/routes/AppRoutes.tsx
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import AdminDashboard from "../pages/admin/Dashboard";
import OrganizerDashboard from "../pages/organizer/Dashboard";
import AuthPage from "../pages/auth/AuthPage";

export default function AppRoutes() {
  return (
    <Router>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/organizer/dashboard" element={<OrganizerDashboard />} />
        <Route path="/" element={<Navigate to="/auth" />} />
      </Routes>
    </Router>
  );
}
