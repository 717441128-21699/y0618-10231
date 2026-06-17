import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Instruments from "@/pages/Instruments";
import InstrumentDetail from "@/pages/InstrumentDetail";
import Calendar from "@/pages/Calendar";
import Reservations from "@/pages/Reservations";
import Reviews from "@/pages/Reviews";
import Logs from "@/pages/Logs";
import Maintenance from "@/pages/Maintenance";
import Qualifications from "@/pages/Qualifications";
import Analytics from "@/pages/Analytics";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/instruments" element={<Instruments />} />
          <Route path="/instruments/:id" element={<InstrumentDetail />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/reservations" element={<Reservations />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/logs" element={<Logs />} />
          <Route path="/maintenance" element={<Maintenance />} />
          <Route path="/qualifications" element={<Qualifications />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}
