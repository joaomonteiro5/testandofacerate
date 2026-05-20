import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Volume2, VolumeX } from "lucide-react";

const ACTIVE_ROUTES = ["/analyze", "/result"];

export function AudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [active, setActive] = useState(false);
  const [muted, setMuted] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const onStart = () => {
      setActive(true);
      const a = audioRef.current;
      if (!a) return;
      a.volume = 0.35;
      a.loop = true;
      a.play().catch(() => undefined);
    };
    window.addEventListener("facerate:audio-start", onStart);
    return () => window.removeEventListener("facerate:audio-start", onStart);
  }, []);

  useEffect(() => {
    const onActiveRoute = ACTIVE_ROUTES.some((r) => pathname.startsWith(r));
    if (!onActiveRoute && active) {
      const a = audioRef.current;
      if (a) {
        a.pause();
        a.currentTime = 0;
      }
      setActive(false);
    }
  }, [pathname, active]);

  const toggle = async () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      try {
        await a.play();
        setMuted(false);
      } catch {
        /* ignore */
      }
    } else {
      a.pause();
      setMuted(true);
    }
  };

  if (!active) return <audio ref={audioRef} src="/audio/play-hard-hardstyle.mp3" preload="auto" />;

  return (
    <>
      <audio ref={audioRef} src="/audio/play-hard-hardstyle.mp3" preload="auto" />
      <button
        onClick={toggle}
        aria-label={muted ? "Ativar som" : "Desativar som"}
        className="fixed right-5 top-5 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white backdrop-blur transition hover:border-white/40 hover:shadow-[0_0_30px_-5px_rgba(255,255,255,0.4)]"
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>
    </>
  );
}
