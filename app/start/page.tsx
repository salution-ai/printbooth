"use client";
import { useEffect, useRef } from "react";

export default function StartPage() {
  const videoRef = useRef(null);

  useEffect(() => {
    async function initCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Không truy cập được camera:", err);
      }
    }

    initCamera();
  }, []);
  return (
    <div className="min-h-screen flex flex-col gap-30 bg-[#FFF7F9] text-[#B84F6F] items-center justify-center text-4xl font-bold">
      <h1>Start Page</h1>
      <div className="flex justify-center">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-[500px] rounded-lg"
        />
      </div>
    </div>
  );
}
