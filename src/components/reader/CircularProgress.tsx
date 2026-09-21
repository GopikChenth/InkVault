interface CircularProgressProps {
  percentage: number; // 0 - 100
  size?: number;
  strokeWidth?: number;
  color?: string;
  showText?: boolean;
  className?: string;
}

export default function CircularProgress({
  percentage,
  size = 36,
  strokeWidth = 3.5,
  color = '#ef4444', // Crimson / Red accent from screenshot
  showText = true,
  className = '',
}: CircularProgressProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(percentage)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90 flex-shrink-0"
      >
        {/* Track background */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-zinc-200 dark:text-zinc-800/80"
        />
        {/* Progress Arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      {showText && (
        <span
          className="text-sm font-bold tracking-tight font-mono"
          style={{ color }}
        >
          {clamped}%
        </span>
      )}
    </div>
  );
}
