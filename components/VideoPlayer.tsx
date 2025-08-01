"use client";

import React, { useEffect, useRef } from "react";
import Hls from "hls.js";
import { VideoOff } from "lucide-react";

interface VideoPlayerProps {
  type: "webrtc" | "hls";
  stream?: MediaStream | null;
  hlsSource?: string;
  isPaused?: boolean;
  isMuted?: boolean;
}

export const VideoPlayer = ({
  type,
  stream,
  hlsSource,
  isPaused = false,
  isMuted = false,
}: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    if (type === "webrtc" && stream) {
      videoRef.current.srcObject = stream;
    } else if (type === "hls" && hlsSource) {
      if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(hlsSource);
        hls.attachMedia(videoRef.current);
        return () => hls.destroy();
      } else if (
        videoRef.current.canPlayType("application/vnd.apple.mpegurl")
      ) {
        videoRef.current.src = hlsSource;
      }
    }
  }, [type, stream, hlsSource]);

  return (
    <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video flex items-center justify-center">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isMuted}
        className={`w-full h-full object-cover ${isPaused ? "opacity-0" : ""}`}
      />
      {isPaused && (
        <div className="absolute inset-0 bg-gray-700 flex items-center justify-center">
          <VideoOff className="w-12 h-12 text-white opacity-50" />
        </div>
      )}
    </div>
  );
};
