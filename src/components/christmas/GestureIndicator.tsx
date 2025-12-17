import { GestureType } from '@/types/christmas';
import { Hand, Grab, Circle, MousePointer, Camera, CameraOff } from 'lucide-react';

interface GestureIndicatorProps {
  gesture: GestureType;
  isTracking: boolean;
  usingMouse: boolean;
  gestureEnabled: boolean;
  onToggleGesture: () => void;
}

const gestureIcons: Record<GestureType, React.ReactNode> = {
  none: <Circle className="w-5 h-5" />,
  fist: <Grab className="w-5 h-5" />,
  open: <Hand className="w-5 h-5" />,
  pinch: <MousePointer className="w-5 h-5" />,
  pointing: <MousePointer className="w-5 h-5" />,
};

const gestureLabels: Record<GestureType, string> = {
  none: 'Detecting...',
  fist: 'Fist - Tree Mode',
  open: 'Open Palm - Galaxy',
  pinch: 'Pinch - Select',
  pointing: 'Pointing',
};

export function GestureIndicator({ 
  gesture, 
  isTracking, 
  usingMouse, 
  gestureEnabled, 
  onToggleGesture 
}: GestureIndicatorProps) {
  return (
    <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
      {/* Gesture Toggle Button */}
      <button
        onClick={onToggleGesture}
        className={`
          glass-gold rounded-xl px-4 py-3 flex items-center gap-3 
          text-foreground transition-all duration-300
          hover:scale-105 active:scale-95
          ${gestureEnabled ? 'ring-2 ring-christmas-green/50' : ''}
        `}
      >
        <div className={`
          p-2 rounded-lg transition-colors duration-300
          ${gestureEnabled 
            ? 'bg-christmas-green/30 text-christmas-snow' 
            : 'bg-muted/50 text-muted-foreground'
          }
        `}>
          {gestureEnabled ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
        </div>
        <span className="text-sm font-medium">
          {gestureEnabled ? '手势控制已启用' : '启用手势控制'}
        </span>
      </button>

      {/* Gesture Status */}
      <div className="glass-gold rounded-xl px-4 py-3 flex items-center gap-3 text-foreground">
        <div className={`
          p-2 rounded-lg 
          ${isTracking 
            ? 'bg-christmas-green/30 text-christmas-snow' 
            : 'bg-muted/50 text-muted-foreground'
          }
          transition-colors duration-300
        `}>
          {usingMouse ? <MousePointer className="w-5 h-5" /> : gestureIcons[gesture]}
        </div>
        
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            {usingMouse ? '鼠标控制' : isTracking ? '检测到手势' : '未检测到手势'}
          </span>
          <span className="text-sm font-medium">
            {usingMouse ? '双击切换模式' : gestureLabels[gesture]}
          </span>
        </div>
        
        {isTracking && (
          <div className="w-2 h-2 rounded-full bg-christmas-green animate-pulse ml-2" />
        )}
      </div>
    </div>
  );
}
