import { useState, useEffect, useCallback } from 'react';

const useShakeDetection = (onShakeThresholdReached, threshold = 15, shakeCountLimit = 10) => {
    const [shakeCount, setShakeCount] = useState(0);
    const [lastShakeTime, setLastShakeTime] = useState(0);

    const handleMotion = useCallback((event) => {
        const { x, y, z } = event.accelerationIncludingGravity;
        const acceleration = Math.sqrt(x * x + y * y + z * z);
        const currentTime = Date.now();

        if (acceleration > threshold) {
            // Check if this shake is far enough from the last one (debounce)
            if (currentTime - lastShakeTime > 200) {
                setShakeCount(prev => {
                    const newCount = prev + 1;
                    if (newCount >= shakeCountLimit) {
                        onShakeThresholdReached();
                        return 0; // Reset after triggering
                    }
                    return newCount;
                });
                setLastShakeTime(currentTime);
            }
        }

        // Reset shake count if too much time passes between shakes (e.g., 5 seconds)
        if (currentTime - lastShakeTime > 5000 && shakeCount > 0) {
            setShakeCount(0);
        }
    }, [lastShakeTime, shakeCount, threshold, shakeCountLimit, onShakeThresholdReached]);

    useEffect(() => {
        if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
            // iOS 13+ requires permission
            // We can't request it here without a user gesture, but we can listen if granted
            window.addEventListener('devicemotion', handleMotion);
        } else {
            window.addEventListener('devicemotion', handleMotion);
        }

        return () => window.removeEventListener('devicemotion', handleMotion);
    }, [handleMotion]);

    return { shakeCount, setShakeCount };
};

export default useShakeDetection;
