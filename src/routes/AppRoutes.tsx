// // src/routes/AppRoutes.tsx
// import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// // Public
// import AuthPage from "../pages/auth/AuthPage";

// // Admin
// import AdminDashboard from "../pages/admin/Dashboard";

// // Organizer Pages
// import OrganizerDashboard from "../pages/organizer/Dashboard";
// import MyEvents from "../pages/organizer/MyEvents";
// import CreateEvent from "../pages/organizer/CreateEvent";
// import EventDetails from "../pages/organizer/EventDetails";

// // Layout
// import OrganizerLayout from "../layouts/OrganizerLayout";

// export default function AppRoutes() {
//   return (
//     <Router>
//       <Routes>
//         {/* Public Routes */}
//         <Route path="/auth" element={<AuthPage />} />
//         <Route path="/" element={<Navigate to="/auth" replace />} />

//         {/* Admin Route */}
//         <Route path="/admin/dashboard" element={<AdminDashboard />} />

//         {/* Organizer Routes – ALL FIXED */}
//         <Route path="/organizer" element={<OrganizerLayout />}>
//           <Route index element={<OrganizerDashboard />} />                    {/* /organizer */}
//           <Route path="dashboard" element={<OrganizerDashboard />} />         {/* /organizer/dashboard */}
//           <Route path="myevents" element={<MyEvents />} />                    {/* /organizer/myevents */}
//           <Route path="create-event" element={<CreateEvent />} />             {/* /organizer/create-event */}
//           <Route path="event/:id" element={<EventDetails />} />               {/* /organizer/event/123 */}
//         </Route>

//         {/* Catch-all */}
//         <Route path="*" element={<Navigate to="/auth" replace />} />
//       </Routes>
//     </Router>
//   );
// }