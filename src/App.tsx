import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Layouts
import MainLayout from "./layouts/MainLayout";
import OrganizerLayout from "./layouts/OrganizerLayout";

// Public Pages
import Home from "./pages/Home";
import Events from "./pages/Events";
import EventDetails from "./pages/EventDetails";
import Bag from "./pages/Bag";
import About from "./pages/About";
import FAQ from "./pages/FAQ";
import Privacy from "./pages/Privacy";
import Refunds from "./pages/Refunds";
import Terms from "./pages/Terms";
import Contact from "./pages/Contact";

// Auth
import AuthPage from "./pages/auth/AuthPage";

// Organizer
import OrganizerDashboard from "./pages/organizer/Dashboard";
import CreateEvent from "./pages/organizer/CreateEvent";
import OrganizerMyEvents from "./pages/organizer/MyEvents";
import OrganizerProfile from "./pages/organizer/Profile";
import OrganizerTickets from "./pages/organizer/Tickets";
import EditEvent from "./pages/organizer/EditEvent";

// Admin
import AdminDashboard from "./pages/admin/Dashboard";
import AdminUsers from "./pages/admin/Users";
import AdminEvents from "./pages/admin/Events";
import AdminTickets from "./pages/admin/Tickets";
import AdminSettings from "./pages/admin/Settings";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* PUBLIC PAGES */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/events" element={<Events />} />
          <Route path="/event/:id" element={<EventDetails />} />
          <Route path="/bag/:orderId" element={<Bag />} />
          <Route path="/about" element={<About />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/refunds" element={<Refunds />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/contact" element={<Contact />} />
        </Route>

        {/* AUTH */}
        <Route path="/auth" element={<AuthPage />} />

        {/* ORGANIZER */}
        <Route path="/organizer" element={<OrganizerLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<OrganizerDashboard />} />
          <Route path="events" element={<OrganizerMyEvents />} />
          <Route path="create-event" element={<CreateEvent />} />
          <Route path="profile" element={<OrganizerProfile />} />
          <Route path="tickets" element={<OrganizerTickets />} />
          <Route path="event/:id" element={<EventDetails />} />
          <Route path="event/:id/edit" element={<EditEvent />} />
        </Route>

        {/* ADMIN */}
        <Route path="/admin">
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="events" element={<AdminEvents />} />
          <Route path="tickets" element={<AdminTickets />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
