"use client";

import Hls from "hls.js";
import { useEffect, useRef } from "react";

export default function LiveViewer() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(`http://localhost:4000/live/master.m3u8`);
      hls.attachMedia(videoRef.current!);

      return () => {
        hls.destroy();
      };
    } else {
      console.error("HLS not supported in this browser");
    }
  }, []);

  return <video ref={videoRef} autoPlay controls className="w-full" />;
}
