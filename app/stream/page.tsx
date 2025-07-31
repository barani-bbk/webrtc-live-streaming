"use client";

import { Button } from "@/components/ui/button";
import { Mic, MicOff, Phone, Video, VideoOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import mediasoupClient, { Device } from "mediasoup-client";
import { io, Socket } from "socket.io-client";
import { Producer, Transport } from "mediasoup-client/types";

const mediaSoupParams = {
  encodings: [
    { rid: "r0", maxBitrate: 100000, scalabilityMode: "S1T3" },
    { rid: "r1", maxBitrate: 300000, scalabilityMode: "S1T3" },
    { rid: "r2", maxBitrate: 900000, scalabilityMode: "S1T3" },
  ],
  codecOptions: { videoGoogleStartBitrate: 1000 },
};

interface RemotePeer {
  id: string;
  videoTrack?: MediaStreamTrack;
  audioTrack?: MediaStreamTrack;
  videoPaused?: boolean;
  audioPaused?: boolean;
}

const Stream = () => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [peers, setPeers] = useState<RemotePeer[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const router = useRouter();

  const socketRef = useRef<Socket | null>(null);
  const deviceRef = useRef<Device | null>(null);
  const producerTransportRef = useRef<Transport | null>(null);
  const consumerTransportRef = useRef<Transport | null>(null);
  const audioProducerRef = useRef<Producer | null>(null);
  const videoProducerRef = useRef<Producer | null>(null);

  useEffect(() => {
    const socket = io("http://localhost:4000");
    socketRef.current = socket;

    socket.on("connectionSuccess", () => {
      getLocalStream();
    });

    socket.on("newProducer", ({ producerId }) => {
      handleNewProducer(producerId);
    });

    socket.on("peerLeft", ({ peerId }) => {
      setPeers((prev) => prev.filter((p) => p.id !== peerId));
    });

    socket.on("producerChange", ({ peerId, kind, paused }) => {
      setPeers((prev) =>
        prev.map((p) => {
          if (p.id === peerId) {
            if (kind === "video") {
              p.videoPaused = paused;
            } else if (kind === "audio") {
              p.audioPaused = paused;
            }
          }
          return p;
        })
      );
    });

    return cleanup;
  }, []);

  const getLocalStream = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
      joinRoom(mediaStream);
    } catch (err) {
      console.error("Failed to get user media:", err);
    }
  };

  const joinRoom = async (mediaStream: MediaStream) => {
    const response = await socketEmitWithAck("joinRoom");
    await createDevice(mediaStream, response.rtpCapabilities);
  };

  const createDevice = async (
    mediaStream: MediaStream,
    rtpCapabilities: any
  ) => {
    try {
      const device = new mediasoupClient.Device();
      await device.load({ routerRtpCapabilities: rtpCapabilities });
      deviceRef.current = device;

      await createSendTransport(mediaStream);
      await createRecvTransport();
      await fetchExistingProducers();
    } catch (err) {
      console.error("Device creation failed:", err);
    }
  };

  const createSendTransport = async (mediaStream: MediaStream) => {
    const response = await socketEmitWithAck("createWebRtcTransport", {
      consumer: false,
    });
    const transport = deviceRef.current!.createSendTransport(response);
    producerTransportRef.current = transport;

    transport.on("connect", async ({ dtlsParameters }, callback, errback) => {
      try {
        socketRef.current!.emit("transportConnect", { dtlsParameters });
        callback();
      } catch (e: any) {
        errback(e);
      }
    });

    transport.on(
      "produce",
      async ({ kind, rtpParameters }, callback, errback) => {
        try {
          socketRef.current!.emit(
            "transportProduce",
            { kind, rtpParameters },
            ({ id }: any) => {
              callback({ id });
            }
          );
        } catch (e: any) {
          errback(e);
        }
      }
    );

    const [audioTrack] = mediaStream.getAudioTracks();
    const [videoTrack] = mediaStream.getVideoTracks();

    if (audioTrack) {
      const audioProducer = await transport.produce({ track: audioTrack });
      audioProducerRef.current = audioProducer;
    }

    if (videoTrack) {
      const videoProducer = await transport.produce({
        track: videoTrack,
        ...mediaSoupParams,
      });
      videoProducerRef.current = videoProducer;
    }
  };

  const createRecvTransport = async () => {
    const response = await socketEmitWithAck("createWebRtcTransport", {
      consumer: true,
    });
    const transport = deviceRef.current!.createRecvTransport(response);
    consumerTransportRef.current = transport;

    transport.on("connect", async ({ dtlsParameters }, callback, errback) => {
      try {
        socketRef.current!.emit("transportRecvConnect", { dtlsParameters });
        callback();
      } catch (e: any) {
        errback(e);
      }
    });
  };

  const fetchExistingProducers = async () => {
    socketRef.current!.emit("getProducers", async ({ producers }: any) => {
      for (const producerId of producers) {
        handleNewProducer(producerId);
      }
    });
  };

  const handleNewProducer = async (remoteProducerId: string) => {
    const { params } = await new Promise<any>((resolve) =>
      socketRef.current!.emit(
        "consume",
        {
          rtpCapabilities: deviceRef.current!.rtpCapabilities,
          remoteProducerId,
          serverConsumerTransportId: consumerTransportRef.current!.id,
        },
        resolve
      )
    );
    if (params?.error) return console.error("Consume error:", params.error);

    const consumer = await consumerTransportRef.current!.consume({
      id: params.id,
      producerId: params.producerId,
      kind: params.kind,
      rtpParameters: params.rtpParameters,
    });

    setPeers((prev) => {
      const existing = prev.find((p) => p.id === params.remoteUserId);
      if (existing) {
        return prev.map((p) =>
          p.id === params.remoteUserId
            ? {
                ...p,
                videoTrack:
                  params.kind === "video" ? consumer.track : p.videoTrack,
                audioTrack:
                  params.kind === "audio" ? consumer.track : p.audioTrack,
              }
            : p
        );
      } else {
        return [
          ...prev,
          {
            id: params.remoteUserId,
            videoTrack: params.kind === "video" ? consumer.track : undefined,
            audioTrack: params.kind === "audio" ? consumer.track : undefined,
          },
        ];
      }
    });

    socketRef.current!.emit("consumerResume", {
      serverConsumerId: params.serverConsumerId,
    });
  };

  const socketEmitWithAck = (event: string, data?: any) =>
    new Promise<any>((resolve) =>
      socketRef.current!.emit(event, data, resolve)
    );

  const toggleVideo = async () => {
    if (!videoProducerRef.current) return;

    if (isVideoOn) {
      socketRef.current?.emit("pauseProducer", { kind: "video" });
      videoProducerRef.current.pause();
      stream?.getVideoTracks().forEach((track) => track.stop());
      if (stream) {
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length > 0) {
          setStream(new MediaStream(audioTracks));
        } else {
          setStream(null);
        }
      }
      setIsVideoOn(false);
    } else {
      try {
        const constraints: MediaStreamConstraints = {
          video: true,
          audio: isMicOn,
        };

        const newStream = await navigator.mediaDevices.getUserMedia(
          constraints
        );

        if (isMicOn && stream) {
          stream.getAudioTracks().forEach((track) => newStream.addTrack(track));
        }

        setStream(newStream);
        if (videoRef.current) videoRef.current.srcObject = newStream;

        const videoTrack = newStream.getVideoTracks()[0];
        await videoProducerRef.current.replaceTrack({ track: videoTrack });
        socketRef.current?.emit("resumeProducer", { kind: "video" });
        videoProducerRef.current.resume();
        setIsVideoOn(true);
      } catch (error) {
        console.error("Failed to resume video:", error);
        setIsVideoOn(false);
      }
    }
  };
  const toggleMic = async () => {
    if (!audioProducerRef.current) return;

    if (isMicOn) {
      socketRef.current?.emit("pauseProducer", { kind: "audio" });
      audioProducerRef.current.pause();
      stream?.getAudioTracks().forEach((track) => track.stop());

      if (stream) {
        const videoTracks = stream.getVideoTracks();
        if (videoTracks.length > 0) {
          setStream(new MediaStream(videoTracks));
        } else {
          setStream(null);
        }
      }
      setIsMicOn(false);
    } else {
      try {
        const constraints = { audio: true, video: isVideoOn };
        const newStream = await navigator.mediaDevices.getUserMedia(
          constraints
        );

        if (isVideoOn && stream) {
          stream.getVideoTracks().forEach((track) => newStream.addTrack(track));
        }

        setStream(newStream);
        if (videoRef.current) videoRef.current.srcObject = newStream;

        const audioTrack = newStream.getAudioTracks()[0];
        await audioProducerRef.current.replaceTrack({ track: audioTrack });
        socketRef.current?.emit("resumeProducer", { kind: "audio" });
        audioProducerRef.current.resume();
        setIsMicOn(true);
      } catch (error) {
        console.error("Failed to resume audio:", error);
        setIsMicOn(false);
      }
    }
  };

  const endCall = () => {
    cleanup();
    router.push("/");
  };

  const cleanup = () => {
    socketRef.current?.disconnect();
    audioProducerRef.current?.close();
    videoProducerRef.current?.close();
    producerTransportRef.current?.close();
    consumerTransportRef.current?.close();
    setPeers([]);
    stream?.getTracks().forEach((track) => track.stop());
    setStream(null);
  };

  const getGridLayout = (count: number) =>
    count <= 1
      ? "grid-cols-1 max-w-xl"
      : count === 2
      ? "grid-cols-2"
      : "grid-cols-3";

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col relative">
      <div className="flex items-center justify-between p-4 bg-gray-800">
        <div className="text-white font-medium">Meeting Room</div>
        <div className="flex items-center space-x-2 text-gray-400 text-sm">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>Live</span>
        </div>
      </div>

      <div className="flex-1 p-4 pb-32 overflow-hidden h-[calc(100vh-56px-113px)] flex items-center justify-center">
        <div
          className={`grid ${getGridLayout(
            peers.length + 1
          )} gap-4 w-full h-full max-h-96 max-w-5xl`}
        >
          <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${
                !isVideoOn ? "opacity-0" : ""
              }`}
            />
            {!isVideoOn && (
              <div className="absolute inset-0 bg-gradient-to-br bg-gray-600 flex items-center justify-center">
                <VideoOff className="w-10 h-10 text-white opacity-70" />
              </div>
            )}

            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
              <div className="bg-black bg-opacity-70 px-2 py-1 rounded text-white text-sm font-medium">
                You
              </div>
              <div className="flex items-center gap-3">
                {!isMicOn && (
                  <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center">
                    <MicOff className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {peers.map((peer) => {
            const stream = new MediaStream(
              [peer.videoTrack, peer.audioTrack].filter(
                Boolean
              ) as MediaStreamTrack[]
            );

            return (
              <div
                key={peer.id}
                className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video flex items-center justify-center"
              >
                <video
                  autoPlay
                  playsInline
                  className={`w-full h-full object-cover ${
                    peer.videoPaused ? "opacity-0" : ""
                  }`}
                  ref={(el) => {
                    if (el) el.srcObject = stream;
                  }}
                />

                {/* Overlay when video is paused */}
                {peer.videoPaused && (
                  <div className="absolute inset-0 bg-gradient-to-br bg-gray-600 flex items-center justify-center">
                    <VideoOff className="w-10 h-10 text-white opacity-70" />
                  </div>
                )}

                {/* Bottom info bar */}
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                  <div className="bg-black bg-opacity-70 px-2 py-1 rounded text-white text-sm font-medium">
                    {peer.id}
                  </div>
                  <div className="flex items-center gap-1">
                    {peer.audioPaused && (
                      <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center">
                        <MicOff className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-gray-800 p-4 border-t border-gray-700 flex justify-center space-x-4">
        <Button
          onClick={toggleMic}
          variant={isMicOn ? "secondary" : "destructive"}
          size="icon"
        >
          {isMicOn ? (
            <Mic className="w-5 h-5" />
          ) : (
            <MicOff className="w-5 h-5" />
          )}
        </Button>
        <Button
          onClick={toggleVideo}
          variant={isVideoOn ? "secondary" : "destructive"}
          size="icon"
        >
          {isVideoOn ? (
            <Video className="w-5 h-5" />
          ) : (
            <VideoOff className="w-5 h-5" />
          )}
        </Button>
        <Button onClick={endCall} variant="destructive" size="icon">
          <Phone className="w-5 h-5 rotate-45" />
        </Button>
      </div>
    </div>
  );
};

export default Stream;
