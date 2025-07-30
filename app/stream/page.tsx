"use client";

import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Mic,
  MicOff,
  Phone,
  Video,
  VideoOff,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const Stream = () => {
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const router = useRouter();

  const participants = [
    {
      id: 1,
      name: "You",
      isVideoOn: isVideoOn,
      isAudioOn: isAudioOn,
      isCurrentUser: true,
    },
    {
      id: 2,
      name: "Alice Johnson",
      isVideoOn: true,
      isAudioOn: true,
      isCurrentUser: false,
    },
  ];

  const participantsPerPage = 2;
  const totalPages = Math.ceil(participants.length / participantsPerPage);
  const currentParticipants = participants.slice(
    currentPage * participantsPerPage,
    (currentPage + 1) * participantsPerPage
  );

  const toggleVideo = () => {
    setIsVideoOn(!isVideoOn);
  };

  const toggleAudio = () => {
    setIsAudioOn(!isAudioOn);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase();
  };

  const nextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const getGridLayout = (count: number) => {
    if (count === 1) return "grid-cols-1 max-w-xl";
    return "grid-cols-2";
  };

  const endCall = () => {
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col relative">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-800">
        <div className="text-white font-medium">Meeting Room</div>
        <div className="flex items-center space-x-4">
          {totalPages > 1 && (
            <div className="flex items-center space-x-2 text-gray-400 text-sm">
              <span>
                Page {currentPage + 1} of {totalPages}
              </span>
            </div>
          )}
          <div className="flex items-center space-x-2 text-gray-400 text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Live</span>
          </div>
        </div>
      </div>

      {/* Participants Grid */}
      <div className="flex-1 p-4 pb-32 overflow-hidden h-[calc(100vh-56px-113px)]! relative flex items-center justify-center">
        {totalPages > 1 && currentPage > 0 && (
          <Button
            onClick={prevPage}
            variant="secondary"
            size="icon"
            className="absolute left-4 top-[calc(50%-2.5rem)] transform -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 text-white border-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
        )}

        {totalPages > 1 && currentPage < totalPages - 1 && (
          <Button
            onClick={nextPage}
            variant="secondary"
            size="icon"
            className="absolute right-4 top-[calc(50%-2.5rem)] transform -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 text-white border-0"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        )}

        <div
          className={`grid ${getGridLayout(
            participants.length
          )} gap-4 w-full h-full max-h-96 max-w-5xl`}
        >
          {currentParticipants.map((participant) => (
            <div
              key={participant.id}
              className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video flex items-center justify-center"
            >
              {participant.isVideoOn ? (
                <div className="w-full h-full bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center">
                  <div className="text-white text-6xl font-bold opacity-30">
                    {getInitials(participant.name)}
                  </div>
                  {/* Simulated video overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-20"></div>
                </div>
              ) : (
                <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-white text-xl font-semibold">
                        {getInitials(participant.name)}
                      </span>
                    </div>
                    <VideoOff className="w-6 h-6 text-gray-400 mx-auto" />
                  </div>
                </div>
              )}

              {/* Participant Info */}
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                <div className="bg-black bg-opacity-70 px-2 py-1 rounded text-white text-sm font-medium">
                  {participant.name}
                  {participant.isCurrentUser && " (You)"}
                </div>
                <div className="flex justify-center items-center gap-1 space-x-1">
                  {!participant.isAudioOn && (
                    <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center">
                      <MicOff className="w-3 h-3 text-white" />
                    </div>
                  )}
                  {participant.isCurrentUser && (
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Controls - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-800 p-4 border-t border-gray-700">
        <div className="flex items-center justify-center space-x-4">
          {/* Audio Toggle */}
          <Button
            onClick={toggleAudio}
            variant={isAudioOn ? "secondary" : "destructive"}
            size="icon"
            className={`w-12 h-12 rounded-full ${
              isAudioOn
                ? "bg-gray-700 hover:bg-gray-600 text-white"
                : "bg-red-600 hover:bg-red-700"
            }`}
            title={isAudioOn ? "Mute" : "Unmute"}
          >
            {isAudioOn ? (
              <Mic className="w-5 h-5" />
            ) : (
              <MicOff className="w-5 h-5" />
            )}
          </Button>

          {/* Video Toggle */}
          <Button
            onClick={toggleVideo}
            variant={isVideoOn ? "secondary" : "destructive"}
            size="icon"
            className={`w-12 h-12 rounded-full ${
              isVideoOn
                ? "bg-gray-700 hover:bg-gray-600 text-white"
                : "bg-red-600 hover:bg-red-700"
            }`}
            title={isVideoOn ? "Turn off camera" : "Turn on camera"}
          >
            {isVideoOn ? (
              <Video className="w-5 h-5" />
            ) : (
              <VideoOff className="w-5 h-5" />
            )}
          </Button>

          {/* End Call */}
          <Button
            onClick={endCall}
            variant="destructive"
            size="icon"
            className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700"
            title="Leave call"
          >
            <Phone className="w-5 h-5 rotate-45" />
          </Button>
        </div>

        {/* Meeting Info */}
        <div className="flex items-center justify-center mt-3 text-gray-400 text-sm">
          <span>{participants.length} participants</span>
          {totalPages > 1 && (
            <>
              <span className="mx-2">•</span>
              <span>
                Showing {currentParticipants.length} of {participants.length}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Stream;
