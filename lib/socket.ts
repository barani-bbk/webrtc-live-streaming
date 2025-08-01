import { io } from "socket.io-client";

export const socket = io(process.env.NEXT_PUBLIC_API_URL, {
  autoConnect: false,
});

export const socketEmitWithAck = (event: string, data?: any): Promise<any> => {
  return new Promise((resolve) => {
    socket.emit(event, data, resolve);
  });
};
