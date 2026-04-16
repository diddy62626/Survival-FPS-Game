import { useEffect, useState } from 'react';

export function useKeyboard() {
  const [actions, setActions] = useState({
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false,
    jump: false,
    shoot: false,
    reload: false,
    ads: false,
  });

  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.code) {
        case 'KeyW': setActions((prev) => ({ ...prev, moveForward: true })); break;
        case 'KeyS': setActions((prev) => ({ ...prev, moveBackward: true })); break;
        case 'KeyA': setActions((prev) => ({ ...prev, moveLeft: true })); break;
        case 'KeyD': setActions((prev) => ({ ...prev, moveRight: true })); break;
        case 'Space': setActions((prev) => ({ ...prev, jump: true })); break;
        case 'KeyR': setActions((prev) => ({ ...prev, reload: true })); break;
      }
    };

    const handleKeyUp = (e) => {
      switch (e.code) {
        case 'KeyW': setActions((prev) => ({ ...prev, moveForward: false })); break;
        case 'KeyS': setActions((prev) => ({ ...prev, moveBackward: false })); break;
        case 'KeyA': setActions((prev) => ({ ...prev, moveLeft: false })); break;
        case 'KeyD': setActions((prev) => ({ ...prev, moveRight: false })); break;
        case 'Space': setActions((prev) => ({ ...prev, jump: false })); break;
        case 'KeyR': setActions((prev) => ({ ...prev, reload: false })); break;
      }
    };

    const handleMouseDown = (e) => {
      if (e.button === 0) setActions((prev) => ({ ...prev, shoot: true }));
      if (e.button === 2) setActions((prev) => ({ ...prev, ads: true }));
    };

    const handleMouseUp = (e) => {
      if (e.button === 0) setActions((prev) => ({ ...prev, shoot: false }));
      if (e.button === 2) setActions((prev) => ({ ...prev, ads: false }));
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return actions;
}
