"use client";

import { useEffect, useState } from "react";
import { MicOff } from "lucide-react";
import { VideoPlayer } from "./VideoPlayer";

interface PeerVideoProps {
  id: string;
  videoTrack?: MediaStreamTrack;
  audioTrack?: MediaStreamTrack;
  videoPaused?: boolean;
  audioPaused?: boolean;
}

export const PeerVideo = ({
  id,
  videoTrack,
  audioTrack,
  videoPaused,
  audioPaused,
}: PeerVideoProps) => {
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    const tracks = [videoTrack, audioTrack].filter(
      (t): t is MediaStreamTrack => t !== undefined
    );
    if (tracks.length > 0) {
      setStream(new MediaStream(tracks));
    } else {
      setStream(null);
    }
  }, [videoTrack, audioTrack]);

  return (
    <div className="relative">
      <VideoPlayer type="webrtc" stream={stream} isPaused={videoPaused} />
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
        <div className="bg-black bg-opacity-70 px-2 py-1 rounded text-white text-sm font-medium">
          {id}
        </div>
        {audioPaused && (
          <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center">
            <MicOff className="w-3 h-3 text-white" />
          </div>
        )}
      </div>
    </div>
  );
};
