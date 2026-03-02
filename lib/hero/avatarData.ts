import { PHOTO_MANIFEST } from '@/lib/hero/photoManifest';
import type { AvatarProfile } from '@/lib/hero/types';

const FIRST_NAMES = [
  'Ava',
  'Noah',
  'Mila',
  'Liam',
  'Aria',
  'Kai',
  'Iris',
  'Ezra',
  'Luna',
  'Mason',
  'Nora',
  'Theo',
  'Leah',
  'Aiden',
  'Sage',
  'Rhea'
];

const LAST_NAMES = [
  'Stone',
  'Vale',
  'Reed',
  'Knox',
  'Morrow',
  'Quill',
  'Hale',
  'Briar',
  'Sloan',
  'Frost',
  'North',
  'Banks',
  'Wilder',
  'Rhodes',
  'Keene',
  'Day'
];

const ACCENTS = ['#2bb8ff', '#8a5bff', '#56d1ff', '#8d6cff', '#43b8ff', '#a353ff', '#f59a32'];

function hashString(input: string): number {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number): () => number {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

function fallbackAvatarSvg(name: string, accent: string, id: string): string {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const hue = hashString(id) % 360;

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <defs>
    <radialGradient id="bg" cx="30%" cy="18%" r="90%">
      <stop offset="0%" stop-color="hsl(${hue}, 58%, 42%)" />
      <stop offset="100%" stop-color="#091326" />
    </radialGradient>
  </defs>
  <circle cx="128" cy="128" r="124" fill="url(#bg)" />
  <circle cx="128" cy="128" r="121" fill="none" stroke="${accent}" stroke-opacity="0.45" stroke-width="5" />
  <text x="50%" y="56%" text-anchor="middle" font-size="88" font-family="'Avenir Next', sans-serif" fill="white" font-weight="700">${initials}</text>
</svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function slugifyHandle(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function getMockAvatarProfiles(count: number): AvatarProfile[] {
  return Array.from({ length: count }, (_, index) => {
    const id = `avatar-${index}`;
    const rng = seededRandom(hashString(id));

    const first = FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)];
    const last = LAST_NAMES[Math.floor(rng() * LAST_NAMES.length)];
    const displayName = `${first} ${last}`;
    const handle = `@${slugifyHandle(first + last)}${100 + index}`;

    const accent = ACCENTS[index % ACCENTS.length];
    const photo = PHOTO_MANIFEST[index % PHOTO_MANIFEST.length];

    return {
      id,
      displayName,
      handle,
      verified: index % 13 === 0,
      accent,
      // Replace with your production user-image URLs when integrating real account data.
      imageUrl: photo?.src ?? fallbackAvatarSvg(displayName, accent, id)
    };
  });
}
