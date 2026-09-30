import { useId } from 'react';
import ArchonQuestIcon from './ArchonQuestIcon.jsx';
import { Emblem } from './RegionIcons.jsx';

// Genshin's World Quest mark: an exclamation mark through a diamond, with a thin gap cut into the
// diamond around the mark so it reads in one colour. Drawn in the current text colour.
const MARK_BAR = 'M40 23 C40 7 60 7 60 23 L53.5 64 Q50 69 46.5 64 Z';

export function WorldQuestIcon(props) {
  const mask = useId();
  return (
    <svg viewBox="0 0 100 100" fill="currentColor" aria-hidden="true" {...props}>
      <defs>
        <mask id={mask}>
          <rect width="100" height="100" fill="#fff" />
          <g fill="#000" stroke="#000" strokeWidth="7" strokeLinejoin="round">
            <path d={MARK_BAR} />
            <circle cx="50" cy="82" r="9" />
          </g>
        </mask>
      </defs>
      <path mask={`url(#${mask})`} fillRule="evenodd" d="M50 20 L86 55 L50 90 L14 55 Z M50 30 L75.5 55 L50 80 L24.5 55 Z" />
      <path d={MARK_BAR} />
      <circle cx="50" cy="82" r="9" />
    </svg>
  );
}

// Genshin's Story Quest mark: a book in a diamond, traced (without its dark disc and ring) from the
// in-game icon, its brightness standing in for transparency.
const STORY_FAINT = 'M6294 10858 c-475 -475 -864 -868 -864 -875 0 -6 5 -15 11 -19 16 -10 228 -14 339 -7 l94 6 641 644 c414 415 648 643 660 643 13 0 250 -229 665 -645 l645 -645 213 0 c186 0 213 2 219 16 8 21 -1712 1744 -1741 1744 -12 0 -351 -331 -882 -862z M5083 9729 c-20 -6 -42 -24 -58 -47 -25 -36 -25 -39 -25 -232 1 -150 4 -201 15 -220 32 -57 8 -90 -64 -90 -34 0 -76 -31 -96 -70 -22 -42 -22 -498 0 -540 21 -40 64 -68 125 -81 60 -13 69 -28 41 -68 -21 -29 -21 -32 -21 -939 l0 -911 21 -36 c27 -46 18 -57 -62 -74 -56 -12 -84 -32 -108 -78 -7 -14 -11 -104 -11 -264 0 -228 1 -244 21 -276 23 -37 65 -63 103 -63 70 0 92 -31 56 -77 -19 -24 -20 -41 -20 -318 l0 -292 33 -62 c52 -98 111 -160 181 -190 l61 -26 1905 5 c1749 5 1907 6 1935 22 45 24 81 63 104 114 l22 45 -1 2111 0 2111 -25 42 c-28 49 -106 103 -159 112 -49 8 -50 12 -56 134 -6 122 -32 175 -113 234 l-42 30 -1865 2 c-1139 1 -1878 -2 -1897 -8z M9572 9277 c-19 -22 -20 -357 -1 -390 8 -16 378 -391 822 -835 537 -537 807 -814 807 -827 0 -14 -271 -291 -810 -830 -728 -727 -812 -815 -824 -855 -16 -53 -14 -376 2 -392 6 -6 19 -7 31 -3 34 11 2071 2056 2071 2079 0 30 -2037 2066 -2066 2066 -12 0 -26 -6 -32 -13z M3663 8227 c-616 -616 -983 -991 -983 -1003 0 -24 1998 -2024 2022 -2024 17 0 18 16 18 217 l0 218 -785 785 c-485 486 -785 792 -785 804 0 12 290 308 760 778 419 418 765 770 770 784 6 14 10 110 10 213 0 185 -4 211 -34 211 -6 0 -453 -442 -993 -983z M5444 4475 c-18 -13 31 -64 846 -880 599 -599 871 -865 886 -865 21 0 1744 1710 1744 1730 0 24 -50 30 -227 30 -158 0 -192 -3 -213 -16 -14 -10 -307 -299 -652 -643 -369 -368 -637 -627 -649 -629 -18 -3 -153 127 -658 631 -350 349 -646 640 -658 646 -35 18 -394 15 -419 -4z';
const STORY_SOLID = 'M5087 9699 c-38 -22 -45 -59 -47 -229 -2 -216 -3 -207 20 -230 18 -18 33 -20 185 -20 187 0 214 -8 273 -75 45 -51 47 -63 47 -356 l0 -265 -27 -42 c-15 -22 -49 -55 -74 -73 l-48 -32 -169 -4 c-185 -4 -201 -8 -211 -54 -11 -56 -7 -1720 4 -1761 15 -54 30 -58 212 -58 l164 0 47 -29 c25 -17 59 -49 74 -72 l28 -43 -3 -280 c-4 -322 -5 -327 -99 -387 l-47 -29 -168 0 c-155 0 -170 -2 -188 -20 -24 -24 -24 -16 -21 -325 3 -283 6 -298 90 -403 82 -103 170 -107 155 -7 -10 70 12 147 55 197 l39 43 1718 5 c1587 5 1721 6 1750 22 38 21 101 84 120 120 16 31 14 3943 -3 4169 -9 133 -32 180 -108 225 l-42 24 -1854 0 c-1241 -1 -1860 -4 -1872 -11z m1761 -1226 c35 -8 26 -38 -23 -78 -24 -20 -70 -70 -102 -112 -60 -78 -75 -90 -161 -118 -290 -94 -429 -444 -278 -699 56 -95 135 -170 226 -214 74 -37 76 -37 200 -37 120 0 128 1 193 32 210 100 337 344 286 549 -15 57 -2 90 58 145 105 96 184 89 212 -20 18 -69 24 -274 11 -367 -29 -202 -177 -419 -364 -532 -177 -108 -432 -137 -629 -71 -31 10 -63 19 -70 19 -29 0 -198 124 -256 188 -63 69 -80 92 -145 200 -64 105 -155 224 -218 283 l-60 57 58 58 c65 64 146 171 244 325 142 224 309 343 545 390 85 17 208 18 273 2z m730 1 c216 -39 383 -142 511 -317 17 -23 68 -98 114 -166 45 -68 117 -161 160 -207 87 -92 88 -96 47 -121 -47 -27 -220 -252 -290 -377 -64 -114 -231 -263 -341 -305 -19 -7 -54 -21 -79 -31 -99 -39 -351 -48 -397 -15 -16 12 -11 19 46 71 35 33 76 77 91 99 51 72 86 101 147 118 120 33 253 144 310 258 134 270 -2 591 -292 686 -268 88 -547 -77 -621 -366 -15 -62 -15 -108 1 -226 6 -37 2 -44 -40 -92 -62 -71 -145 -112 -179 -90 -70 46 -98 371 -47 537 89 284 319 489 606 539 139 24 149 24 253 5z m-373 -1690 c56 -18 113 -27 188 -31 62 -3 107 -10 107 -16 0 -6 -71 -79 -158 -163 -87 -84 -176 -177 -196 -208 -48 -68 -65 -76 -91 -41 -65 84 -166 193 -247 266 -179 162 -177 159 -58 159 76 0 155 14 250 44 66 21 115 19 205 -10z M5035 9120 c-16 -4 -46 -8 -67 -9 -27 -1 -42 -8 -62 -32 l-26 -31 0 -252 c0 -309 -4 -303 172 -321 61 -6 64 -5 102 26 21 18 52 53 67 78 l29 45 0 176 0 176 -30 47 c-29 46 -111 108 -140 106 -8 -1 -28 -5 -45 -9z M4998 6396 c-46 -8 -75 -18 -92 -35 l-26 -24 0 -253 c0 -306 -4 -297 125 -319 110 -20 153 -1 215 93 l30 45 0 180 c0 207 -3 216 -92 287 -54 43 -58 44 -160 26z';

export function StoryQuestIcon(props) {
  return <Emblem faint={STORY_FAINT} solid={STORY_SOLID} viewBox="252 252 932 932" size={1440} {...props} />;
}

const QUESTS = {
  archon: { Icon: ArchonQuestIcon, name: 'Archon Quest' },
  world: { Icon: WorldQuestIcon, name: 'World Quest' },
  story: { Icon: StoryQuestIcon, name: 'Story Quest' },
};

// A card's quest type in its top-left corner: the quest's mark (or `icon` in its place, such as a
// role's region emblem), its name (or `name` in its place) and, after a colon, the card's own label
// if it has one ("World Quest: Featured Project"). The tag sits over the card's corner; `spacer`
// keeps room for it above the card's content.
export default function QuestTag({ type, label, icon, name: nameOverride, spacer = true }) {
  const { Icon: QuestIcon, name: questName } = QUESTS[type];
  const Icon = icon ?? QuestIcon;
  const name = nameOverride ?? questName;
  return (
    <>
      <p className="quest-tag"><Icon />{label ? `${name}: ${label}` : name}</p>
      {spacer && <div className="quest-tag-spacer" aria-hidden="true" />}
    </>
  );
}
