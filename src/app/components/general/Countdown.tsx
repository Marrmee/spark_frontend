import React, { useState, useEffect } from 'react';

interface CountdownState {
  weeks?: number;
  days?: number;
  hours: number;
  minutes: number;
  seconds: number;
}

interface CountdownTimerProps {
  endTimestamp: number;
  className?: string;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ endTimestamp, className }) => {
  const [timeLeft, setTimeLeft] = useState<CountdownState>({
    weeks: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const difference = endTimestamp - now;

      if (difference <= 0) {
        clearInterval(timer);
        setTimeLeft({ weeks: 0, days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        const weeks = Math.floor(difference / (3600 * 24 * 7));
        const days = Math.floor((difference % (3600 * 24 * 7)) / (3600 * 24));
        const hours = Math.floor((difference % (3600 * 24)) / 3600);
        const minutes = Math.floor((difference % 3600) / 60);
        const seconds = Math.floor(difference % 60);

        if (weeks > 0) {
          setTimeLeft({ weeks, days, hours, minutes, seconds });
        } else if (days > 0) {
          setTimeLeft({ days, hours, minutes, seconds });
        } else {
          setTimeLeft({ hours, minutes, seconds });
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endTimestamp]);

  return (
    <div className={`flex justify-center items-center gap-2 text-sm whitespace-nowrap ${className}`}>
      {timeLeft.weeks !== undefined && timeLeft.weeks > 0 && (
        <span className="flex items-center">
          <span className="text-neonGreen">{timeLeft.weeks}</span>
          <span className="ml-1 text-gray-400">w</span>
        </span>
      )}
      {timeLeft.days !== undefined && timeLeft.days > 0 && (
        <span className="flex items-center">
          <span className="text-neonGreen">{timeLeft.days}</span>
          <span className="ml-1 text-gray-400">d</span>
        </span>
      )}
      <span className="flex items-center">
        <span className="text-neonGreen">{timeLeft.hours}</span>
        <span className="ml-1 text-gray-400">h</span>
      </span>
      <span className="flex items-center">
        <span className="text-neonGreen">{timeLeft.minutes}</span>
        <span className="ml-1 text-gray-400">m</span>
      </span>
      <span className="flex items-center">
        <span className="text-neonGreen">{timeLeft.seconds}</span>
        <span className="ml-1 text-gray-400">s</span>
      </span>
    </div>
  );
};

export default CountdownTimer;
