# Live Streaming using webrtc (Next.js + Mediasoup + HLS)

A modern frontend for real-time streaming and live viewing, built with Next.js, TypeScript, mediasoup-client, HLS.js, and Socket.IO.

## Project Structure

```
/ # Root
|-- /app                        # Next.js App Router pages
| |-- /stream                   # Streaming page: produces video/audio
| | |-- page.tsx
| |
| |-- /watch                    # Watch page: views live HLS playback
| | |-- page.tsx
| |
| |-- layout.tsx                # Shared layout
| |-- page.tsx                  # Home page (optional)
|
|-- /components
| |-- /ui/                      # UI primitives (buttons, icons, etc.)
| |-- StreamControls.tsx        # Controls: mute, video toggle, leave
| |-- PeerVideo.tsx             # Renders WebRTC peers (with mic/video icons)
| |-- VideoPlayer.tsx           # Generic video component
|
|-- /hooks
| |-- useStream.ts              # Streaming logic: connect, produce, consume
| |-- useWatch.ts               # Live viewer logic: load HLS playlist
|
|-- /lib
| |-- mediasoup-client.ts       # Setup mediasoup and transports
| |-- socket.ts                 # Socket.IO client config
|
|-- next.config.js
|-- package.json
|-- tsconfig.json
```

## Installation

```
npm install

or

yarn install
```

🚀 Running locally

Make sure the backend server (Mediasoup SFU + HLS) is running and the env is setup

```
npm run dev
```

Open http://localhost:3000 to view in your browser.

## How it works (high level)

### Streaming flow (/stream)

- Connect to backend using Socket.IO.

- Request router RTP capabilities.

- Create mediasoup-client device.

- Create WebRTC send & receive transports.

- Capture local video/audio via getUserMedia.

- Produce local video & audio tracks to mediasoup.

- Consume remote peers’ producers → render them in PeerVideo.tsx.

- Toggle mic/video via StreamControls.tsx by pausing/resuming producers.

- Backend forwards each producer as RTP → converts to HLS for playback.

### Watching flow (/watch)

- Request live playlist for a specific peer from backend.

- Use HLS.js (VideoPlayer.tsx) to load & play .m3u8 playlist.

- Video/audio segments are streamed via HLS as they’re produced.

- Player updates automatically as new segments are added.

## Components overview

PeerVideo.tsx – Renders a single peer’s video + overlays for mic/video status.

VideoPlayer.tsx – Plays either WebRTC stream or HLS playlist.

StreamControls.tsx – Buttons to mute, disable video, or leave call.

useStream.ts – Custom React hook: handles mediasoup-client logic, socket events.

useWatch.ts – Loads and monitors HLS playlist for live view.
