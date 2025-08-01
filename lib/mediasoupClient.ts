import { Device, Producer, Transport } from "mediasoup-client/types";
import { socket, socketEmitWithAck } from "./socket";
import * as client from "mediasoup-client";

const MEDIA_SOUP_PARAMS = {
  encodings: [
    { rid: "r0", maxBitrate: 100000, scalabilityMode: "S1T3" },
    { rid: "r1", maxBitrate: 300000, scalabilityMode: "S1T3" },
    { rid: "r2", maxBitrate: 900000, scalabilityMode: "S1T3" },
  ],
  codecOptions: { videoGoogleStartBitrate: 1000 },
};

class MediasoupClient {
  public device: Device | null = null;
  public producerTransport: Transport | null = null;
  public consumerTransport: Transport | null = null;
  public videoProducer: Producer | null = null;
  public audioProducer: Producer | null = null;

  async createDevice() {
    try {
      const response = await socketEmitWithAck("getRouterRtpCapabilities");
      const device = new client.Device();
      await device.load({ routerRtpCapabilities: response.rtpCapabilities });
      this.device = device;
    } catch (error) {
      console.error("Failed to create Mediasoup device:", error);
    }
  }

  async createSendTransport() {
    if (!this.device) throw new Error("Device not initialized.");
    const params = await socketEmitWithAck("createWebRtcTransport", {
      isConsumer: false,
    });
    this.producerTransport = this.device.createSendTransport(params);
    this.producerTransport.on(
      "connect",
      async ({ dtlsParameters }, callback, errback) => {
        try {
          await socketEmitWithAck("connectTransport", {
            transportId: this.producerTransport!.id,
            dtlsParameters,
          });
          callback();
        } catch (e) {
          errback(e as Error);
        }
      }
    );

    this.producerTransport.on(
      "produce",
      async ({ kind, rtpParameters }, callback, errback) => {
        try {
          const { id } = await socketEmitWithAck("transportProduce", {
            kind,
            rtpParameters,
          });
          callback({ id });
        } catch (e) {
          errback(e as Error);
        }
      }
    );
  }

  async createRecvTransport() {
    if (!this.device) throw new Error("Device not initialized.");
    const params = await socketEmitWithAck("createWebRtcTransport", {
      isConsumer: true,
    });
    this.consumerTransport = this.device.createRecvTransport(params);

    this.consumerTransport.on(
      "connect",
      async ({ dtlsParameters }, callback, errback) => {
        try {
          await socketEmitWithAck("connectTransport", {
            transportId: this.consumerTransport!.id,
            dtlsParameters,
          });
          callback();
        } catch (e) {
          errback(e as Error);
        }
      }
    );
  }

  async produceVideo(videoTrack: MediaStreamTrack) {
    if (!this.producerTransport)
      throw new Error("Producer transport not ready.");

    this.videoProducer = await this.producerTransport.produce({
      track: videoTrack,
      ...MEDIA_SOUP_PARAMS,
    });
  }

  async produceAudio(audioTrack: MediaStreamTrack) {
    if (!this.producerTransport)
      throw new Error("Producer transport not ready.");
    this.audioProducer = await this.producerTransport.produce({
      track: audioTrack,
    });
  }

  async consume(remoteProducerId: string) {
    if (!this.device || !this.consumerTransport)
      throw new Error("Device or consumer transport not ready.");

    const { rtpCapabilities } = this.device;
    const params = await socketEmitWithAck("transportConsume", {
      rtpCapabilities,
      remoteProducerId,
    });

    if (params.error) {
      console.error("Consume error:", params.error);
      return null;
    }

    const consumer = await this.consumerTransport.consume({
      id: params.id,
      producerId: params.producerId,
      kind: params.kind,
      rtpParameters: params.rtpParameters,
    });

    socket.emit("resumeConsumer", { consumerId: consumer.id });

    return consumer;
  }

  close() {
    this.audioProducer?.close();
    this.videoProducer?.close();
    this.producerTransport?.close();
    this.consumerTransport?.close();
  }
}

export const mediasoupClient = new MediasoupClient();
