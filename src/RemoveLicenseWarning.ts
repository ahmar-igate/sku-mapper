import React, { useEffect } from 'react';

const HideLicenseWarning: React.FC = () => {
  useEffect(() => {
    // Function to hide any matching warning element
    const hideWarning = () => {
      const warnings = document.querySelectorAll('div');
      warnings.forEach((warning) => {
        if (warning.textContent?.trim() === 'MUI X Missing license key') {
          (warning as HTMLElement).style.display = 'none';
          // Optionally, remove any attributes that might trigger re-display
          // warning.remove();
          // console.log('License warning element hidden.');
        }
      });
    };

    // Run immediately on mount
    hideWarning();

    // Use a MutationObserver to hide the element whenever new nodes are added
    const observer = new MutationObserver(() => {
      hideWarning();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Also, use setInterval as a backup in case the observer misses any re-insertions
    const intervalId = setInterval(hideWarning, 500);

    return () => {
      observer.disconnect();
      clearInterval(intervalId);
    };
  }, []);

  return null;
};

export default HideLicenseWarning;
