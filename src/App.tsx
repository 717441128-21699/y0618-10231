import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { RequireRole } from "@/components/RequireRole";
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
import AuditTrail from "@/pages/AuditTrail";

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
          <Route path="/logs" element={<Logs />} />
          <Route path="/analytics" element={<Analytics />} />

          {/* Admin / Director only */}
          <Route element={<RequireRole allow={["admin", "director"]} />}>
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/maintenance" element={<Maintenance />} />
            <Route path="/audit" element={<AuditTrail />} />
          </Route>

          {/* Director only (granting qualifications is director-only in this lab) */}
          <Route element={<RequireRole allow={["director", "admin"]} />}>
            <Route path="/qualifications" element={<Qualifications />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}
