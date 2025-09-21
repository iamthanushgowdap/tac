
"use client";

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Paperclip } from 'lucide-react';

interface AnimatedDownloadButtonProps {
  onClick: () => void;
  fileName: string;
  fileSize: number;
}

export function AnimatedDownloadButton({ onClick, fileName, fileSize }: AnimatedDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isDownloading) {
      timer = setTimeout(() => {
        setIsDone(true);
      }, 3000); // Corresponds to the animation duration
    }
    return () => clearTimeout(timer);
  }, [isDownloading]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!isDownloading && !isDone) {
      setIsDownloading(true);
      onClick();
    } else if (isDone) {
      // Allow re-triggering download after completion if desired
      setIsDownloading(false);
      setIsDone(false);
    }
  };

  const buttonClasses = cn(
    'animated-download-button group relative flex items-center justify-between overflow-hidden rounded-lg bg-primary text-primary-foreground shadow-lg transition-all duration-300 ease-in-out hover:shadow-2xl',
    {
      'loading': isDownloading,
    }
  );

  return (
    <button onClick={handleClick} className={buttonClasses} aria-label={`Download ${fileName}`}>
      <div className="flex h-full flex-col items-start justify-center p-3 text-left">
          <span className="text-sm font-medium transition-transform duration-500 group-[.loading]:-translate-y-full group-[.loading]:opacity-0">
            {fileName}
          </span>
          <span className="absolute left-3 text-sm font-medium opacity-0 transition-transform duration-500 group-[.loading]:translate-y-0 group-[.loading]:opacity-100">
            Downloading...
          </span>
          <span className="text-xs text-primary-foreground/70">
            ({(fileSize / (1024 * 1024)).toFixed(2)} MB)
          </span>
      </div>
      <div className="icon-wrapper relative flex h-full w-14 flex-shrink-0 items-center justify-center bg-black/20">
        <div className="icon-line absolute h-4 w-0.5 bg-primary-foreground transition-transform duration-500 ease-out group-[.loading]:animate-line"></div>
        <svg
          className="icon-svg absolute z-10 h-5 w-5 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round] group-[.loading]:animate-svg"
          viewBox="0 0 24 24"
        >
          <path d={isDone ? "M3 14 L8 19 L21 6" : "M4 12 l8 8 l8 -8"} />
        </svg>
        <div className="icon-background absolute h-full w-full origin-bottom transform rounded-b-full bg-black transition-transform duration-300 ease-in group-[.loading]:animate-background"></div>
      </div>
    </button>
  );
}
