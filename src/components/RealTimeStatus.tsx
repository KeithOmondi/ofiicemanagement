// src/components/RealTimeStatus.tsx

import React from 'react';
import { useAppSelector } from '../store/hook';
import { Wifi, WifiOff } from 'lucide-react';

export const RealTimeStatus: React.FC = () => {
  const socketConnected = useAppSelector((state) => state.messages.socketConnected);

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${
        socketConnected 
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
          : 'bg-amber-50 text-amber-700 border border-amber-200'
      }`}>
        {socketConnected ? (
          <>
            <Wifi size={12} className="text-emerald-500" />
            <span className="font-medium">Live</span>
          </>
        ) : (
          <>
            <WifiOff size={12} className="text-amber-500" />
            <span className="font-medium">Connecting...</span>
          </>
        )}
      </div>
    </div>
  );
};