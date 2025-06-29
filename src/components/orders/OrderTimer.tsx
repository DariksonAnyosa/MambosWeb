import React from 'react';
import { useOrderTimer } from '../../hooks/useOrderTimer';

interface OrderTimerProps {
  startTime: string;
  status: string;
  className?: string;
}

export const OrderTimer: React.FC<OrderTimerProps> = ({ 
  startTime, 
  status, 
  className = '' 
}) => {
  const { elapsed, formattedTime, colorClass } = useOrderTimer(startTime, status);

  if (status === 'completed' || status === 'cancelled') {
    return (
      <span className={`text-sm text-gray-500 ${className}`}>
        Finalizado
      </span>
    );
  }

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${
        status === 'preparing' ? 'bg-blue-500 animate-pulse' : 
        status === 'ready' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-400'
      }`} />
      <span className={`text-sm font-medium ${colorClass}`}>
        {formattedTime}
      </span>
    </div>
  );
};
