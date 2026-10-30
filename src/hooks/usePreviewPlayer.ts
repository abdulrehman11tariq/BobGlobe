import { useState, useEffect } from 'react';
import { previewPlayer, type PlayerState } from '../audio/previewPlayer';

export function usePreviewPlayer(): PlayerState & {
  player: typeof previewPlayer;
} {
  const [state, setState] = useState<PlayerState>(() => previewPlayer.getState());

  useEffect(() => {
    const unsubscribe = previewPlayer.subscribe(setState);
    return unsubscribe;
  }, []);

  return {
    ...state,
    player: previewPlayer,
  };
}
