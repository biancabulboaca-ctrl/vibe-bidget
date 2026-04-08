interface LogoProps {
  size?: number;
  className?: string;
}

export default function Logo({ size = 32, className = "" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}>
      <defs>
        <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#14b8a6" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
      </defs>
      {/* Background circle */}
      <rect width="32" height="32" rx="8" fill="url(#logo-grad)" />
      {/* V shape as upward trend line */}
      <polyline
        points="5,10 13,22 19,14 27,7"
        stroke="white"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Dot at the peak — highlight */}
      <circle cx="27" cy="7" r="2.2" fill="white" />
    </svg>
  );
}
