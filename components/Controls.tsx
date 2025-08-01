import { Button } from "@/components/ui/button";
import { Mic, MicOff, Phone, Video, VideoOff } from "lucide-react";

interface ControlsProps {
  isMicOn: boolean;
  isVideoOn: boolean;
  onToggleMic: () => void;
  onToggleVideo: () => void;
  onEndCall: () => void;
}

export const Controls = ({
  isMicOn,
  isVideoOn,
  onToggleMic,
  onToggleVideo,
  onEndCall,
}: ControlsProps) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-800 p-4 border-t border-gray-700 flex justify-center space-x-8">
      <Button
        className="cursor-pointer"
        onClick={onToggleMic}
        variant={isMicOn ? "secondary" : "destructive"}
        size="icon"
        aria-label={isMicOn ? "Mute microphone" : "Unmute microphone"}
      >
        {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-s" />}
      </Button>
      <Button
        className="cursor-pointer"
        onClick={onToggleVideo}
        variant={isVideoOn ? "secondary" : "destructive"}
        size="icon"
        aria-label={isVideoOn ? "Turn off camera" : "Turn on camera"}
      >
        {isVideoOn ? (
          <Video className="w-5 h-5" />
        ) : (
          <VideoOff className="w-5 h-5" />
        )}
      </Button>
      <Button
        className="cursor-pointer"
        onClick={onEndCall}
        variant="destructive"
        size="icon"
        aria-label="End call"
      >
        <Phone className="w-5 h-5" />
      </Button>
    </div>
  );
};
