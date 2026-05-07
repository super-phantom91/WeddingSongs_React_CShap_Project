import { Navigate, Route, Routes } from "react-router-dom";
import { NewWeddingPage } from "./pages/NewWeddingPage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/new-wedding" replace />} />
      <Route path="/new-wedding" element={<NewWeddingPage />} />
      <Route path="*" element={<Navigate to="/new-wedding" replace />} />
    </Routes>
  );
}
