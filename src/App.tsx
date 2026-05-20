import { Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
import Analyze from "./pages/Analyze";
import Result from "./pages/Result";
import { AudioPlayer } from "./components/AudioPlayer";

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/analyze" element={<Analyze />} />
        <Route path="/result" element={<Result />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <AudioPlayer />
    </>
  );
}
