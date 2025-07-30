import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <div className="font-sans flex flex-col items-center justify-center min-h-[80vh] p-8 pb-20 gap-16 sm:p-20">
      <h1 className="text-3xl">Live Streaming using WebRTC</h1>
      <div className="flex flex-row gap-4">
        <Link href={"/stream"}>
          <Button className="cursor-pointer" variant="outline">
            Stream
          </Button>
        </Link>
        <Link href={"/watch"}>
          <Button className="cursor-pointer" variant="outline">
            Watch
          </Button>
        </Link>
      </div>
    </div>
  );
}
