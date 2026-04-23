import { useEffect, useState } from "react";

interface SlideInPanelProps {
  isVisible: boolean;
  children: React.ReactNode;
}

export default function SlideInPanel({ isVisible, children }: SlideInPanelProps) {
  const [mounted, setMounted] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setMounted(true);
    } else {
      setAnimateIn(false);
    }
  }, [isVisible]);

  useEffect(() => {
    if (mounted && !animateIn && isVisible) {
      const frame = requestAnimationFrame(() => {
        setAnimateIn(true);
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [mounted, animateIn, isVisible]);

  if (!mounted) return null;

  return (
    <div
      onTransitionEnd={(e) => {
        if (e.propertyName === "max-width" && !animateIn) {
          setMounted(false);
        }
      }}
      className={`overflow-hidden transition-[max-width] duration-200 ease-out ${
        animateIn ? "max-w-[360px]" : "max-w-0"
      }`}
    >
      <div
        className={`transform transition-transform duration-200 ease-out ${
          animateIn ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
