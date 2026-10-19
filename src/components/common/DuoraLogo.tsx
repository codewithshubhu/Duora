import React from 'react';

interface DuoraLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  className?: string;
}

export const DuoraLogo: React.FC<DuoraLogoProps> = ({
  size = 'md',
  showTagline = true,
  className = ''
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20'
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl'
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Official Duora Brand Icon: Interlocking Private Shield & Chat Monogram */}
      <div className={`relative ${iconSizes[size]} shrink-0 flex items-center justify-center`}>
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-md"
        >
          <defs>
            <linearGradient id="duoraGrad1" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#8E78FF" />
              <stop offset="60%" stopColor="#7057E8" />
              <stop offset="100%" stopColor="#5236DB" />
            </linearGradient>
            <linearGradient id="duoraGrad2" x1="80" y1="20" x2="20" y2="80" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#EDE8FF" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#D5CAFF" stopOpacity="0.4" />
            </linearGradient>
            <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Outer Curved Shield / Pebble */}
          <rect
            x="8"
            y="8"
            width="84"
            height="84"
            rx="26"
            fill="url(#duoraGrad1)"
          />

          {/* Inner Overlapping Rings representing dual private connection */}
          <circle
            cx="40"
            cy="46"
            r="20"
            stroke="#FFFFFF"
            strokeWidth="7"
            strokeLinecap="round"
            fill="none"
            opacity="0.95"
          />
          <circle
            cx="60"
            cy="54"
            r="19"
            stroke="url(#duoraGrad2)"
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
          />

          {/* Core Secure Node */}
          <circle
            cx="50"
            cy="50"
            r="5"
            fill="#FFFFFF"
            filter="url(#softGlow)"
          />
          
          {/* Subtle Private Connection Beam */}
          <path
            d="M32 38L68 62"
            stroke="#FFFFFF"
            strokeWidth="3.5"
            strokeLinecap="round"
            opacity="0.8"
          />
        </svg>
      </div>

      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 leading-none">
          <span className={`font-extrabold tracking-tight font-sans ${textSizes[size]} text-[#191824] dark:text-white`}>
            Duora
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#7057E8] inline-block mb-1" />
        </div>
        {showTagline && (
          <span className="text-[11px] font-medium tracking-wide text-[#7057E8] dark:text-[#A796FF] uppercase font-sans mt-0.5">
            Connect Privately.
          </span>
        )}
      </div>
    </div>
  );
};

export const DuoraWatermark: React.FC = () => {
  return (
    <div className="flex items-center justify-center gap-2 py-3 text-xs text-stone-400 dark:text-stone-500 font-sans">
      <span>Duora</span>
      <span>•</span>
      <span>Connect Privately.</span>
      <span>•</span>
      <span>Engineered by Shubham Mishra</span>
    </div>
  );
};
