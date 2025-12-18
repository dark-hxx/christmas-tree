import { useState } from 'react';
import { X, Video, VideoOff } from 'lucide-react';

interface CameraDebugProps {
  enabled: boolean;
}

// Simplified CameraDebug - just shows status indicator, no duplicate camera stream
export function CameraDebug({ enabled }: CameraDebugProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible || !enabled) return null;

  return (
    <div className="absolute bottom-20 left-4 z-50">
      <div className="glass-gold rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 bg-black/30">
          <div className="flex items-center gap-2">
            <Video className="w-3 h-3 text-christmas-green" />
            <span className="text-xs text-white">手势识别已启用</span>
          </div>
          <button 
            onClick={() => setIsVisible(false)}
            className="text-white/70 hover:text-white ml-2"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
