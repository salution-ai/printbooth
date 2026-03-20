// "use client";

// import { useEffect, useRef } from "react";

// type ImageCanvasProps = {
//   src: string;
//   alt?: string;
//   width: number;
//   height: number;
// };

// export default function ImageCanvas({ src, alt, width, height }: ImageCanvasProps) {
//   const canvasRef = useRef<HTMLCanvasElement>(null);

//   useEffect(() => {
//     const canvas = canvasRef.current;
//     if (!canvas) return;

//     const ctx = canvas.getContext("2d");
//     if (!ctx) return;

//     const img = new Image();
//     img.crossOrigin = "anonymous"; // Nếu ảnh ở domain khác và có CORS
//     img.onload = () => {
//       ctx.clearRect(0, 0, canvas.width, canvas.height);
//       ctx.drawImage(img, 0, 0, width, height);
//     };
//     img.src = src;
//   }, [src, width, height]);

//   return (
//     <div
//       style={{ width, height, position: "relative" }}
//       onContextMenu={(e) => e.preventDefault()} // Chặn chuột phải
//     >
//       <canvas
//         ref={canvasRef}
//         width={width}
//         height={height}
//         style={{
//           width: "100%",
//           height: "100%",
//           display: "block",
//           userSelect: "none",
//           pointerEvents: "none", // Chặn kéo ảnh
//         }}
//         aria-label={alt}
//       />
//     </div>
//   );
// }

"use client";

import { useEffect, useRef, useState } from "react";

type ImageCanvasProps = {
  src: string;
  alt?: string;
  className?: string;
};

export default function ImageCanvas({ src, alt, className }: ImageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setSize({ width, height });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width === 0 || size.height === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    fetch(src)
      .then((res) => res.blob())
      .then((blob) => {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, size.width, size.height);

          // Tính toán giữ nguyên tỷ lệ như object-contain
          const aspectRatio = img.width / img.height;
          const containerRatio = size.width / size.height;

          let drawWidth = size.width;
          let drawHeight = size.height;
          let offsetX = 0;
          let offsetY = 0;

          if (aspectRatio > containerRatio) {
            // Ảnh rộng hơn khung => fit theo chiều ngang
            drawWidth = size.width;
            drawHeight = size.width / aspectRatio;
            offsetY = (size.height - drawHeight) / 2;
          } else {
            // Ảnh cao hơn khung => fit theo chiều dọc
            drawHeight = size.height;
            drawWidth = size.height * aspectRatio;
            offsetX = (size.width - drawWidth) / 2;
          }

          ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
          URL.revokeObjectURL(img.src);
        };
        img.src = URL.createObjectURL(blob);
      });
  }, [src, size]);

  return (
    <div
      ref={containerRef}
      className={className}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <canvas
        ref={canvasRef}
        width={size.width}
        height={size.height}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          userSelect: "none",
          pointerEvents: "none",
        }}
        aria-label={alt}
      />
    </div>
  );
}
