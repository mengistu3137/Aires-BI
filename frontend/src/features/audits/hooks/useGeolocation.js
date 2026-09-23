import { useState, useCallback } from "react";

/**
 * Custom hook for capturing GPS coordinates with accuracy
 */
export const useGeolocation = () => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState(null);

  const captureLocation = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const err = new Error("Geolocation is not supported by this device");
        setError(err.message);
        reject(err);
        return;
      }

      setIsCapturing(true);
      setError(null);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setIsCapturing(false);
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracyMeters: position.coords.accuracy,
          });
        },
        (err) => {
          setIsCapturing(false);
          let message = "Unable to retrieve location";
          switch (err.code) {
            case err.PERMISSION_DENIED:
              message = "Location permission denied. Please enable GPS access.";
              break;
            case err.POSITION_UNAVAILABLE:
              message = "Location information is unavailable.";
              break;
            case err.TIMEOUT:
              message = "Location request timed out. Please try again.";
              break;
            default:
              message = err.message || message;
          }
          setError(message);
          reject(new Error(message));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    });
  }, []);

  return {
    captureLocation,
    isCapturing,
    error,
  };
};
