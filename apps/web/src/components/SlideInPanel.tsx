import { useCallback, useEffect, useRef, useState } from "react";

interface SlideInPanelProps {
  isVisible: boolean;
  children: React.ReactNode;
  width?: number;
}

export default function SlideInPanel({ isVisible, children, width = 360 }: SlideInPanelProps) {
  const [mounted, setMounted] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const rafRef = useRef<number | null>(null);
  const outerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible) {
      setMounted(true);
    } else {
      setAnimateIn(false);
    }
  }, [isVisible]);

  useEffect(() => {
    if (mounted && !animateIn && isVisible) {
      rafRef.current = requestAnimationFrame(() => {
        setAnimateIn(true);
      });
    }
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [mounted, animateIn, isVisible]);

  const handleTransitionEnd = useCallback((e: React.TransitionEvent<HTMLDivElement>) => {
    if (
      e.target === outerRef.current &&
      e.propertyName === "max-width" &&
      !animateIn
    ) {
      setMounted(false);
    }
  }, [animateIn]);

  if (!mounted) return null;

  return (
    <div
      ref={outerRef}
      onTransitionEnd={handleTransitionEnd}
      className="h-full overflow-hidden transition-[max-width] duration-200 ease-out"
      style={{ maxWidth: animateIn ? `${width}px` : "0px" }}
    >
      <div
        className={`h-full transform transition-transform duration-200 ease-out ${
          animateIn ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
