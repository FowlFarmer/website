import { useEffect, useState } from 'react';
import { onPageScroll, pageScrollY } from './pageScroll.js';

// jias-react-components' useScrollThresholdFade, following the page's scroll (pageScroll.js):
// `{ opacity: 1 }` while it's scrolled between `minPx` and `maxPx`, else `{ opacity: 0 }`.
export default function usePageScrollFade(minPx = 0, maxPx = Infinity) {
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    const update = () => {
      const y = pageScrollY();
      setOpacity(y < minPx || y > maxPx ? 0 : 1);
    };
    update();
    return onPageScroll(update);
  }, [minPx, maxPx]);

  return { opacity };
}
