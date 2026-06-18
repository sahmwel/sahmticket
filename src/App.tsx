import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";

// Layouts (keep as normal imports – they are small)
import MainLayout from "./layouts/MainLayout";
import OrganizerLayout from "./layouts/OrganizerLayout";

// Lazy load all page components
const Home = lazy(() => import("./pages/Home"));
const Events = lazy(() => import("./pages/Events"));
const EventDetails = lazy(() => import("./pages/EventDetails"));
const Bag = lazy(() => import("./pages/Bag"));
const About = lazy(() => import("./pages/About"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Refunds = lazy(() => import("./pages/Refunds"));
const Terms = lazy(() => import("./pages/Terms"));
const Contact = lazy(() => import("./pages/Contact"));
const OrganizerTeaser = lazy(() => import("./components/OrganizerTeaser/OrganizerTeaser"));
const AuthPage = lazy(() => import("./pages/auth/AuthPage"));
const OrganizerDashboard = lazy(() => import("./pages/organizer/Dashboard"));
const CreateEvent = lazy(() => import("./pages/organizer/CreateEvent"));
const OrganizerMyEvents = lazy(() => import("./pages/organizer/MyEvents"));
const OrganizerProfile = lazy(() => import("./pages/organizer/Profile"));
const OrganizerTickets = lazy(() => import("./pages/organizer/Tickets"));
const EditEvent = lazy(() => import("./pages/organizer/EditEvent"));
const OrganizerEventDetails = lazy(() => import("./pages/organizer/EventDetails"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminUsers = lazy(() => import("./pages/admin/Users"));
const AdminEvents = lazy(() => import("./pages/admin/Events"));
const AdminTickets = lazy(() => import("./pages/admin/Tickets"));
const AdminSettings = lazy(() => import("./pages/admin/Settings"));
const AdminNewsletter = lazy(() => import("./pages/admin/Newsletter"));

// Fallback component while loading
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* PUBLIC PAGES */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/events" element={<Events />} />
            <Route path="/event/:slug" element={<EventDetails />} />
            <Route path="/event/id/:id" element={<EventDetails />} />
            <Route path="/bag/:orderId" element={<Bag />} />
            <Route path="/about" element={<About />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/refunds" element={<Refunds />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/teaser" element={<OrganizerTeaser />} />
          </Route>

          {/* AUTH */}
          <Route path="/auth" element={<AuthPage />} />

          {/* ORGANIZER */}
          <Route path="/organizer" element={<OrganizerLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<OrganizerDashboard />} />
            <Route path="events" element={<OrganizerMyEvents />} />
            <Route path="my-events" element={<OrganizerMyEvents />} />
            <Route path="create-event" element={<CreateEvent />} />
            <Route path="profile" element={<OrganizerProfile />} />
            <Route path="tickets" element={<OrganizerTickets />} />
            <Route path="event/:id" element={<OrganizerEventDetails />} />
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
            <Route path="newsletter" element={<AdminNewsletter />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;