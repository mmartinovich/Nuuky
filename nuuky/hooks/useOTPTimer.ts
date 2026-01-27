import { useState, useEffect, useCallback } from "react";

/**
 * Hook for managing OTP resend cooldown timer
 * @param initialSeconds - Cooldown duration in seconds (default: 60)
 */
export const useOTPTimer = (initialSeconds: number = 60) => {
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining((prev) => prev - 1);
      }, 1000);
    } else if (secondsRemaining === 0) {
      setIsActive(false);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, secondsRemaining]);

  /**
   * Start the cooldown timer
   */
  const startTimer = useCallback(() => {
    setSecondsRemaining(initialSeconds);
    setIsActive(true);
  }, [initialSeconds]);

  /**
   * Reset the timer (stops countdown and resets to 0)
   */
  const resetTimer = useCallback(() => {
    setSecondsRemaining(0);
    setIsActive(false);
  }, []);

  /**
   * Format seconds as MM:SS
   */
  const formattedTime = `${Math.floor(secondsRemaining / 60)}:${(secondsRemaining % 60).toString().padStart(2, "0")}`;

  return {
    secondsRemaining,
    formattedTime,
    isActive,
    canResend: !isActive && secondsRemaining === 0,
    startTimer,
    resetTimer,
  };
};
