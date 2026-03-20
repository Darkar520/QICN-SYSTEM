import { useMemo } from 'react';

export const useDeviceCapabilities = () => {
  return useMemo(() => {
    const nav = typeof navigator !== 'undefined' ? navigator : null;
    const hasWindow = typeof window !== 'undefined';
    const secureContext = hasWindow ? window.isSecureContext : false;
    const mediaDevices = nav?.mediaDevices;
    const supportsCamera = Boolean(mediaDevices?.getUserMedia);
    const supportsMicrophone = Boolean(mediaDevices?.getUserMedia);
    const speechCtor = hasWindow ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
    const supportsSpeechRecognition = Boolean(speechCtor);
    const touchEnabled = hasWindow && ('ontouchstart' in window || (nav?.maxTouchPoints || 0) > 0);
    const pointerFine = hasWindow ? window.matchMedia?.('(pointer: fine)')?.matches ?? false : false;

    return {
      secureContext,
      supportsCamera,
      supportsMicrophone,
      supportsSpeechRecognition,
      touchEnabled,
      pointerFine
    };
  }, []);
};

export default useDeviceCapabilities;
