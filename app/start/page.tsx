"use client";
import { motion } from "framer-motion";
import { ArrowRight, Camera, FlipHorizontal } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Playwrite_IE } from "next/font/google";
import Image from "next/image";
import { LoadingSpinner } from "@/components/loading-spinner";
import PhysicalButton from "@/components/buttons/physical-button";
import { uploadImage } from "@/services/cloudinary-service";

const playwrightIE = Playwrite_IE({
  weight: ["400"],
});

const FRAME_TYPE_OPTIONS: { id: string; name: string; slots: number }[] = [
  { id: "1", name: "1x3", slots: 3 },
  { id: "2", name: "1x4", slots: 4 },
  { id: "3", name: "2x2", slots: 4 },
];

let shutterAudioContext: AudioContext | null = null;

function playShutterSound() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (
        window as Window & {
          webkitAudioContext?: typeof AudioContext;
        }
      ).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!shutterAudioContext || shutterAudioContext.state === "closed") {
      shutterAudioContext = new AudioContextClass();
    }
    const ctx = shutterAudioContext;
    void ctx.resume();

    const t = ctx.currentTime;
    const duration = 0.1;
    const sampleRate = ctx.sampleRate;
    const n = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, n, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < n; i++) {
      const env = Math.exp(-5 * (i / n));
      data[i] = (Math.random() * 2 - 1) * env * 0.62;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 3200;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.92, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    noise.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(ctx.destination);
    noise.start(t);
    noise.stop(t + duration);

    const click = ctx.createOscillator();
    const clickGain = ctx.createGain();
    click.type = "square";
    click.frequency.setValueAtTime(2200, t);
    clickGain.gain.setValueAtTime(0.12, t);
    clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);
    click.connect(clickGain);
    clickGain.connect(ctx.destination);
    click.start(t);
    click.stop(t + 0.03);
  } catch {
    // Bỏ qua nếu trình duyệt chặn âm thanh
  }
}

export default function StartPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [randomUUID, setRandomUUID] = useState<string>("");
  const [uploadedImages, setUploadedImages] = useState<
    { row_number: number; Image: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  
  const [selectedFrameType, setSelectedFrameType] = useState<
    (typeof FRAME_TYPE_OPTIONS)[number]
  >(FRAME_TYPE_OPTIONS[0]);
  const uploadUrl = randomUUID
    ? `https://salution.net/print-up?code=${randomUUID}`
    : "";
  const qrImageUrl = uploadUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(uploadUrl)}`
    : "";

  const slotCount = selectedFrameType.slots;
  const slotImages = useMemo(() => {
    const sorted = [...uploadedImages].sort(
      (a, b) => a.row_number - b.row_number,
    );
    return Array.from({ length: slotCount }, (_, i) => sorted[i] ?? null);
  }, [uploadedImages, slotCount]);

  useEffect(() => {
    // setRandomUUID(crypto.randomUUID());
    setRandomUUID("de2f49a4-0d27-43e6-bfad-edfac6786c0a");
  }, []);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const res = await fetch(
          `https://n8n.salution.net/webhook/image-sections?section=${randomUUID}`,
        );
        const data = await res.json();
        setUploadedImages(data);
      } catch (err) {
        console.error("Error fetching images:", err);
      } finally {
        setIsLoading(false);
      }
    }
    if (randomUUID) {
      fetchData();
    }
  }, [randomUUID]);

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

  async function handleCapture() {
    if (!randomUUID || isCapturing) return;
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      console.error("Camera chưa sẵn sàng");
      return;
    }
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return;

    playShutterSound();
    setIsCapturing(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas không khả dụng");
      if (isFlipped) {
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, w, h);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.92),
      );
      if (!blob) throw new Error("Không tạo được ảnh");

      const file = new File([blob], `capture-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });

      const stored = await uploadImage(file, randomUUID);

      const webhookRes = await fetch(
        "https://n8n.salution.net/webhook/image-sections",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            section: randomUUID,
            imageUrl: stored.url,
          }),
        },
      );
      if (!webhookRes.ok) {
        throw new Error(`Webhook: ${webhookRes.status}`);
      }

      const listRes = await fetch(
        `https://n8n.salution.net/webhook/image-sections?section=${randomUUID}`,
      );
      const data = await listRes.json();
      setUploadedImages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Chụp / upload ảnh thất bại:", err);
    } finally {
      setIsCapturing(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col gap-10 bg-[#FFF7F9] text-[#B84F6F] items-center justify-center font-bold">
      <div>
        <motion.p
          animate={{ scale: [1, 1.2, 1] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <p className={`text-6xl text-center ${playwrightIE.className}`}>
            {process.env.NEXT_PUBLIC_BRAND_NAME}
          </p>
        </motion.p>
      </div>
      <div className="flex gap-10">
        <div className="relative flex flex-col items-center justify-center gap-4">
        <div className="flex gap-2">
          {FRAME_TYPE_OPTIONS.map((frameType) => (
            <div key={frameType.id} className={`border-2 border-[#B84F6F] rounded-md px-4 py-2 ${selectedFrameType.id === frameType.id ? "bg-[#B84F6F] text-white" : ""}`} onClick={() => setSelectedFrameType(frameType)}>
              <p>{frameType.name}</p>
            </div>
          ))}
        </div>
          <button
            type="button"
            onClick={() => setIsFlipped((prev) => !prev)}
            className="absolute right-3 top-3 z-10 rounded-md bg-black/60 px-3 py-2 text-base text-white"
          >
            <FlipHorizontal className="h-4 w-4" />
          </button>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-[700px] rounded-lg transition-transform duration-500 ease-in-out"
            style={{
              transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
            }}
          />
          <PhysicalButton
            className="bg-[#B84F6F] text-white rounded-full"
            onClick={handleCapture}
            disabled={isCapturing || !randomUUID || slotImages.filter(Boolean).length >= slotCount}
          >
            <Camera className="h-4 w-4 mr-2" />
            {isCapturing ? "Đang tải lên..." : "Chụp auto"}
          </PhysicalButton>
        </div>
        <div>
          <div>
            {qrImageUrl && (
              <div className="mb-4 flex flex-col items-center gap-2 rounded-md border-2 border-dashed border-[#B84F6F] p-4 fixed top-8 right-8">
                <Image
                  src={qrImageUrl}
                  alt="QR upload ảnh"
                  width={180}
                  height={180}
                  unoptimized
                  className="h-[180px] w-[180px] rounded bg-white p-1"
                />
                <p className="text-center text-xs font-medium">
                  Quét QR để upload ảnh
                </p>
              </div>
            )}
          </div>
          {/* <div className="flex flex-col items-center justify-center gap-2 w-40 border-2 border-dashed border-[#B84F6F] rounded-md p-4">
            <ImagePlus className="h-10 w-10" />
            Upload ảnh
          </div> */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-2 w-40">
              <LoadingSpinner size="sm" />
              Đang tải ảnh...
            </div>
          ) : (
            <div className="flex w-full max-w-md flex-col gap-3">
              <p className="text-center text-sm font-semibold">
                {slotImages.filter(Boolean).length}/{slotCount} ảnh · {selectedFrameType.name}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {slotImages.map((image, index) => (
                  <div
                    className="flex aspect-square max-h-[180px] w-full items-center justify-center overflow-hidden rounded-xs border-2 border-dashed border-[#B84F6F] bg-white/40"
                    key={`slot-${selectedFrameType.id}-${index}`}
                  >
                    {image ? (
                      <Image
                        src={image.Image}
                        alt={`Ảnh ${index + 1}`}
                        width={180}
                        height={180}
                        unoptimized
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="px-2 text-center text-xs font-medium text-[#B84F6F]/70">
                        Slot {index + 1}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <PhysicalButton className="bg-[#B84F6F] text-white rounded-full" disabled={slotImages.filter(Boolean).length !== slotCount}>
                Tiếp tục <br />
                (Bước chọn khung)
              </PhysicalButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
