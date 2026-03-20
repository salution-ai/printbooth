'use client';
import { useEffect, useRef, useState } from 'react';
import styles from './loading.module.css';

export default function Loading() {
  const logoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let angle = 0;
    const baseVelocity = (2 * Math.PI) / 4; // quay 1 vòng trong 4 giây
    const scaleMin = 0.95;
    const scaleMax = 1.05;
    const scaleSpeed = 1; // 1 lần/phút thở

    let frameId: number;

    function animate() {
      const time = Date.now() * 0.001;
      const scale = scaleMin + ((Math.sin(time * scaleSpeed * 2 * Math.PI) + 1) / 2) * (scaleMax - scaleMin);

      angle += baseVelocity * (1 / 60);

      if (logoRef.current) {
        logoRef.current.style.transform = `
          rotate(${angle}rad)
          scale(${scale})
        `;
      }

      frameId = requestAnimationFrame(animate);
    }

    animate();
    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <div>
      <div ref={logoRef} className={styles.logo} style={{
        animation: 'blink 1.2s infinite'
      }}></div>
      <div
        className="gradient-text font-bold text-center mt-[-70px]"
        style={{
          animation: 'blink 1.2s infinite'
        }}
      >
        {(() => {
          const messages = [
            "Một chút nữa thôi...",
            "Chỉ một giây nữa thôi...",
            "Sắp xong rồi nè...",
            "Đợi xíu nha, gần xong rồi...",
            "Chút xíu nữa thôi là xong!",
            "Đang lấy dữ liệu về nè...",
            "Gần tới nơi rồi!",
            "Sắp có kết quả rồi nha...",
            "Đang xử lý siêu tốc...",
          ];
          const [message, setMessage] = useState(messages[Math.floor(Math.random() * messages.length)]);

          useEffect(() => {
            const interval = setInterval(() => {
              setMessage(messages[Math.floor(Math.random() * messages.length)]);
            }, 2000);
            return () => clearInterval(interval);
          }, []);
          return message;
        })()}
      </div>
      <style jsx>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
