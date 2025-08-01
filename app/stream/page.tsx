"use client";

import { Controls } from "@/components/Controls";
import { PeerVideo } from "@/components/PeerVideo";
import { VideoPlayer } from "@/components/VideoPlayer";
import { useStream } from "@/hooks/useStream";
import { MicOff } from "lucide-react";

const getGridLayout = (count: number) => {
  if (count <= 1) return "grid-cols-1 max-w-5xl";
  if (count === 2) return "grid-cols-2 max-w-6xl";
  return "grid-cols-2 md:grid-cols-3 max-w-6xl";
};

export default function StreamPage() {
  const {
    localStream,
    peers,
    isMicOn,
    isVideoOn,
    toggleMic,
    toggleVideo,
    endCall,
  } = useStream();

  return (
    <div className="min-h-screen overflow-hidden bg-gray-900 flex flex-col relative text-white">
      <div className="flex items-center justify-between p-4 bg-gray-800">
        <h1 className="text-lg font-medium">My Stream</h1>
        <div className="flex items-center space-x-2 text-sm">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>Live</span>
        </div>
      </div>

      <main className="p-4 h-[calc(100vh-129px)] overflow-hidden">
        <div
          className={`grid place-items-center gap-4 w-full h-full mx-auto ${getGridLayout(
            peers.length + 1
          )}`}
        >
          <div className="relative">
            <VideoPlayer
              type="webrtc"
              stream={localStream}
              isPaused={!isVideoOn}
              isMuted={true}
            />
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
              <div className="bg-black bg-opacity-70 px-2 py-1 rounded text-white text-sm font-medium">
                You
              </div>
              {!isMicOn && (
                <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center">
                  <MicOff className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          </div>

          {peers.map((peer) => (
            <PeerVideo key={peer.id} {...peer} />
          ))}
        </div>
      </main>

      <Controls
        isMicOn={isMicOn}
        isVideoOn={isVideoOn}
        onToggleMic={toggleMic}
        onToggleVideo={toggleVideo}
        onEndCall={endCall}
      />
    </div>
  );
}
