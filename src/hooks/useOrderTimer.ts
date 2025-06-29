import { useState, useEffect } from 'react';

export const useOrderTimer = (startTime: string, status: string) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (status === 'completed' || status === 'cancelled') {
      return; // No actualizar si ya terminó
    }

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const start = new Date(startTime).getTime();
      const diff = Math.floor((now - start) / 1000 / 60); // en minutos
      setElapsed(diff);
    }, 1000); // Actualizar cada segundo

    return () => clearInterval(interval);
  }, [startTime, status]);

  const formatTime = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getColorClass = (minutes: number) => {
    if (minutes < 15) return 'text-green-600';
    if (minutes < 30) return 'text-yellow-600';
    return 'text-red-600';
  };

  return {
    elapsed,
    formattedTime: formatTime(elapsed),
    colorClass: getColorClass(elapsed)
  };
};
