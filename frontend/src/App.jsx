import { Navigate, Route, Routes } from 'react-router-dom';
import AdminShell from './pages/AdminShell.jsx';
import SchedulingPage from './pages/SchedulingPage.jsx';
import AvailabilityPage from './pages/AvailabilityPage.jsx';
import MeetingsPage from './pages/MeetingsPage.jsx';
import PublicBookingPage from './pages/PublicBookingPage.jsx';
import BookingConfirmationPage from './pages/BookingConfirmationPage.jsx';
import { PlaceholderPage, NotFoundPage } from './pages/UtilityPages.jsx';
import './App.css';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app/scheduling" replace />} />
      <Route path="/app" element={<AdminShell />}>
        <Route index element={<Navigate to="scheduling" replace />} />
        <Route path="scheduling" element={<SchedulingPage />} />
        <Route path="meetings" element={<MeetingsPage />} />
        <Route path="availability" element={<AvailabilityPage />} />
        <Route
          path="contacts"
          element={<PlaceholderPage title="Contacts" description="Static shell replica queued for the final polish pass." />}
        />
        <Route
          path="workflows"
          element={<PlaceholderPage title="Workflows" description="Static shell replica queued for the final polish pass." />}
        />
        <Route
          path="integrations"
          element={<PlaceholderPage title="Integrations & apps" description="Static shell replica queued for the final polish pass." />}
        />
        <Route
          path="routing"
          element={<PlaceholderPage title="Routing" description="Static shell replica queued for the final polish pass." />}
        />
        <Route
          path="analytics"
          element={<PlaceholderPage title="Analytics" description="Static shell replica queued for the final polish pass." />}
        />
        <Route
          path="admin"
          element={<PlaceholderPage title="Admin center" description="Static shell replica queued for the final polish pass." />}
        />
      </Route>
      <Route path="/:username/:slug/confirmation" element={<BookingConfirmationPage />} />
      <Route path="/:username/:slug" element={<PublicBookingPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
