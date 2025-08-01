"use client";

import { VideoPlayer } from "@/components/VideoPlayer";
import { useWatch } from "@/hooks/useWatch";

export default function WatchPage() {
  const { peers } = useWatch();

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <h1 className="text-2xl font-bold mb-6">Live Streams</h1>
      {peers.length > 0 ? (
        <div className=" p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {peers.map((peer) => (
            <div
              key={peer.peerId}
              className="relative bg-gray-800 rounded-lg overflow-hidden"
            >
              <VideoPlayer
                type="hls"
                hlsSource={`${process.env.NEXT_PUBLIC_API_URL}/live/${peer.peerId}.m3u8`}
              />
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 px-2 py-1 text-xs rounded">
                {peer.peerId}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-400">No live streams available right now.</p>
        </div>
      )}
    </div>
  );
}
