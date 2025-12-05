// src/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Layout
import MainLayout from './layouts/MainLayout';

// Pages with Navbar + Footer
import Home from './pages/Home';
import Events from './pages/Events';
import EventDetails from './pages/EventDetails';
import Checkout from './pages/Checkout';
import Bag from './pages/Bag';
import About from './pages/About';
import Privacy from './pages/Privacy';
import Refunds from './pages/Refunds';
import Terms from './pages/Terms';
import Contact from './pages/Contact';
import FAQ from './pages/FAQ';

// Full-screen pages (NO Navbar/Footer)
import AuthModal from './pages/AuthModal';
import OrganizerDashboard from './pages/OrganizerDashboard';
import CreateEvent from './pages/CreateEvent'; // Usually full-screen for organizers
import AuthPage from './pages/auth/AuthPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* === PAGES WITH NAVBAR + FOOTER (MainLayout) === */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/events" element={<Events />} />
          <Route path="/event/:id" element={<EventDetails />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/bag/:orderId" element={<Bag />} />
          
          {/* Static Pages */}
          <Route path="/about" element={<About />} />
           <Route path="/faq" element={<FAQ />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/refunds" element={<Refunds />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/contact" element={<Contact />} />
        </Route>

        {/* === FULL-SCREEN PAGES (No Navbar/Footer) === */}
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/dashboard" element={<OrganizerDashboard />} />
        <Route path="/create-event" element={<CreateEvent />} />
        <Route path="/create-event-form" element={<CreateEvent />} /> {/* In case you use this route */}

        {/* Optional: 404 */}
        {/* <Route path="*" element={<NotFound />} /> */}

      </Routes>
    </BrowserRouter>
  );
}

export default App;