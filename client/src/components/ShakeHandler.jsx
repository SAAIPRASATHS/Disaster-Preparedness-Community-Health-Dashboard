import React, { useEffect } from 'react';
import axios from 'axios';
import useShakeDetection from '../hooks/useShakeDetection';
import { useToast } from './Toast';

const ShakeHandler = () => {
    const toast = useToast();

    const triggerSOS = async () => {
        toast.info('Shake detected 10 times! Triggering emergency SOS...');

        if (!navigator.geolocation) {
            toast.error('Geolocation not supported. SOS aborted.');
            return;
        }

        navigator.geolocation.getCurrentPosition(async (position) => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    toast.error('You must be logged in to trigger SOS');
                    return;
                }

                const { latitude, longitude } = position.coords;
                // Reverse geocoding would be better here, but let's use coords for now
                const response = await axios.post('/api/sos', {
                    location: {
                        lat: latitude,
                        lng: longitude,
                        address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
                    },
                    message: 'Emergency SOS triggered by shake detection'
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (response.data.success) {
                    toast.success('SOS alert sent successfully to authorities!');
                }
            } catch (error) {
                console.error('SOS trigger error:', error);
                toast.error('Failed to send SOS alert');
            }
        }, () => {
            toast.error('Location access denied. SOS aborted.');
        });
    };

    const { shakeCount } = useShakeDetection(triggerSOS);

    // Provide subtle feedback for shakes
    useEffect(() => {
        if (shakeCount > 0 && shakeCount < 10) {
            toast.info(`Shake detected: ${shakeCount}/10`, { duration: 1000 });
        }
    }, [shakeCount, toast]);

    return null; // Background component
};

export default ShakeHandler;
