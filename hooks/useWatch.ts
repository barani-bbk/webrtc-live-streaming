"use client";

import { useState, useEffect } from "react";

interface LivePeer {
  peerId: string;
}

export const useWatch = () => {
  const [peers, setPeers] = useState<LivePeer[]>([]);

  useEffect(() => {
    const eventSource = new EventSource(
      `${process.env.NEXT_PUBLIC_API_URL}/api/live-streams`
    );

    eventSource.addEventListener("init", (e) => {
      const data = JSON.parse(e.data);
      setPeers(data.livePeers);
    });

    eventSource.addEventListener("peerLive", (e) => {
      const { peerId } = JSON.parse(e.data);
      setPeers((prev) => [...prev, { peerId }]);
    });

    eventSource.addEventListener("peerLeft", (e) => {
      const { peerId } = JSON.parse(e.data);
      setPeers((prev) => prev.filter((p) => p.peerId !== peerId));
    });

    return () => {
      eventSource.close();
    };
  }, []);

  return { peers };
};
