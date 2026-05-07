import { Navigate, Route, Routes } from "react-router-dom";
import { DashboardPage } from "./pages/DashboardPage";
import { EventFolderPage } from "./pages/EventFolderPage";
import { NewWeddingPage } from "./pages/NewWeddingPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SongLibraryPage } from "./pages/SongLibraryPage";
import { WeddingEventsPage } from "./pages/WeddingEventsPage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/song-library" element={<SongLibraryPage />} />
      <Route path="/wedding-events" element={<WeddingEventsPage />} />
      <Route path="/event-folder" element={<EventFolderPage />} />
      <Route path="/wedding-events/new-wedding" element={<NewWeddingPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
