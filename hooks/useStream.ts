"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { socket } from "@/lib/socket";
import { mediasoupClient } from "@/lib/mediasoupClient";

interface RemotePeer {
  id: string;
  videoTrack?: MediaStreamTrack;
  audioTrack?: MediaStreamTrack;
  videoPaused?: boolean;
  audioPaused?: boolean;
}

export const useStream = () => {
  const router = useRouter();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<Map<string, RemotePeer>>(new Map());
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const localStreamRef = useRef<MediaStream | null>(null);
  const isInitialized = useRef(false);

  const cleanup = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    mediasoupClient.close();
    socket.disconnect();
    setPeers(new Map());
    setLocalStream(null);
    localStreamRef.current = null;
    setIsSocketConnected(false);
    isInitialized.current = false;
  }, []);

  const initializeMediaStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      setLocalStream(stream);
      localStreamRef.current = stream;

      await mediasoupClient.createDevice();
      await mediasoupClient.createSendTransport();
      await mediasoupClient.createRecvTransport();

      const [audioTrack] = stream.getAudioTracks();
      const [videoTrack] = stream.getVideoTracks();

      if (audioTrack) await mediasoupClient.produceAudio(audioTrack);
      if (videoTrack) await mediasoupClient.produceVideo(videoTrack);

      socket.emit("getProducers", async ({ producers }: any) => {
        for (const { peerId: remoteUserId, producerId } of producers) {
          handleNewProducer(remoteUserId, producerId);
        }
      });
    } catch (error) {
      console.error("Failed to initialize media stream:", error);
    }
  }, []);

  const handleNewProducer = useCallback(
    async (peerId: string, producerId: string) => {
      console.log("handleNewProducer", peerId, producerId);
      const consumer = await mediasoupClient.consume(producerId);

      console.log("consumer", consumer);
      if (!consumer) return;

      setPeers((prevPeers) => {
        const newPeers = new Map(prevPeers);
        let peer = newPeers.get(peerId);

        if (!peer) {
          peer = { id: peerId };
        }

        if (consumer.kind === "video") peer.videoTrack = consumer.track;
        if (consumer.kind === "audio") peer.audioTrack = consumer.track;

        newPeers.set(peerId, peer);
        return newPeers;
      });
    },
    []
  );

  const handlePeerLeft = useCallback((peerId: string) => {
    setPeers((prevPeers) => {
      const newPeers = new Map(prevPeers);
      newPeers.delete(peerId);
      return newPeers;
    });
  }, []);

  const handleProducerChange = useCallback(
    ({
      peerId,
      kind,
      paused,
    }: {
      peerId: string;
      kind: "video" | "audio";
      paused: boolean;
    }) => {
      setPeers((prevPeers) => {
        const newPeers = new Map(prevPeers);
        const peer = newPeers.get(peerId);
        if (peer) {
          if (kind === "video") peer.videoPaused = paused;
          if (kind === "audio") peer.audioPaused = paused;
          newPeers.set(peerId, { ...peer });
        }
        return newPeers;
      });
    },
    []
  );

  // Handle socket connection
  const handleSocketConnect = useCallback(() => {
    console.log("Socket connected!");
    setIsSocketConnected(true);
  }, []);

  const handleSocketDisconnect = useCallback(() => {
    console.log("Socket disconnected!");
    setIsSocketConnected(false);
  }, []);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    socket.on("connect", handleSocketConnect);
    socket.on("disconnect", handleSocketDisconnect);
    socket.on("newProducer", ({ producerSocketId, producerId }) => {
      handleNewProducer(producerSocketId, producerId);
    });
    socket.on("peerLeft", ({ peerId }) => handlePeerLeft(peerId));
    socket.on("producerChange", handleProducerChange);

    socket.connect();

    return () => {
      cleanup();
      socket.off("connect", handleSocketConnect);
      socket.off("disconnect", handleSocketDisconnect);
      socket.off("newProducer");
      socket.off("peerLeft");
      socket.off("producerChange");
    };
  }, [
    cleanup,
    handleSocketConnect,
    handleSocketDisconnect,
    handleNewProducer,
    handlePeerLeft,
    handleProducerChange,
  ]);

  useEffect(() => {
    if (isSocketConnected && !localStream) {
      initializeMediaStream();
    }
  }, [isSocketConnected, localStream, initializeMediaStream]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      cleanup();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [cleanup]);

  const toggleMic = useCallback(async () => {
    if (!mediasoupClient.audioProducer) return;
    const nextState = !isMicOn;
    setIsMicOn(nextState);
    if (nextState) {
      mediasoupClient.audioProducer.resume();
    } else {
      mediasoupClient.audioProducer.pause();
    }
    socket.emit(nextState ? "resumeProducer" : "pauseProducer", {
      kind: "audio",
    });
  }, [isMicOn]);

  const toggleVideo = useCallback(async () => {
    if (!mediasoupClient.videoProducer) return;
    const nextState = !isVideoOn;
    setIsVideoOn(nextState);
    if (nextState) {
      mediasoupClient.videoProducer.resume();
    } else {
      mediasoupClient.videoProducer.pause();
    }
    socket.emit(nextState ? "resumeProducer" : "pauseProducer", {
      kind: "video",
    });
  }, [isVideoOn]);

  const endCall = useCallback(async () => {
    cleanup();
    await new Promise((resolve) => setTimeout(resolve, 100));
    router.push("/");
  }, [cleanup, router]);

  return {
    localStream,
    peers: Array.from(peers.values()),
    isMicOn,
    isVideoOn,
    isSocketConnected,
    toggleMic,
    toggleVideo,
    endCall,
  };
};
