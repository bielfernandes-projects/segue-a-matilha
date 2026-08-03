import React from 'react';
import { getAvatarById } from '@segue/shared';

interface DogAvatarProps {
  avatarId: string;
  size?: number;
  className?: string;
}

type EarStyle = 'pointy' | 'floppy' | 'round';

const EAR_STYLES: Record<string, EarStyle> = {
  husky: 'pointy',
  golden: 'floppy',
  beagle: 'floppy',
  pastor: 'pointy',
  pug: 'round',
  border_collie: 'pointy',
  poodle: 'floppy',
  shiba: 'pointy',
  frenchie: 'round',
  corgi: 'pointy',
  dalmata: 'floppy',
  pitbull: 'round',
  salsicha: 'floppy',
  rottweiler: 'pointy',
  wolf: 'pointy',
  samoyeda: 'round',
  pinscher: 'pointy',
  labrador: 'floppy',
  chowchow: 'round',
  doberman: 'pointy',
};

const TONGUES = new Set(['samoyeda', 'labrador', 'chowchow', 'pinscher']);
const PATCHES = new Set(['husky', 'beagle', 'border_collie', 'dalmata', 'rottweiler']);

/**
 * Avatar canino em SVG inline — consistente em qualquer plataforma/celular
 * (diferente dos emojis, que mudam de aparencia entre Android, iOS e Windows).
 */
export const DogAvatar: React.FC<DogAvatarProps> = ({ avatarId, size = 40, className }) => {
  const avatar = getAvatarById(avatarId);
  const ears = EAR_STYLES[avatar.id] ?? 'pointy';
  const hasTongue = TONGUES.has(avatar.id);
  const hasPatch = PATCHES.has(avatar.id);
  const color = avatar.color;
  const dark = '#1F2937';
  const cream = '#F6E7D2';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label={`Avatar: ${avatar.breed}`}
    >
      {ears === 'pointy' && (
        <>
          <path d="M15 24 L24 7 L27 21 Z" fill={color} />
          <path d="M49 24 L40 7 L37 21 Z" fill={color} />
          <path d="M19 19 L23 11 L25 19 Z" fill={dark} opacity="0.25" />
          <path d="M45 19 L41 11 L39 19 Z" fill={dark} opacity="0.25" />
        </>
      )}
      {ears === 'floppy' && (
        <>
          <path d="M11 22 Q10 36 19 38 Q24 28 19 19 Z" fill={color} />
          <path d="M53 22 Q54 36 45 38 Q40 28 45 19 Z" fill={color} />
          <path d="M16 26 Q15 33 19 35" stroke={dark} strokeWidth="2" fill="none" opacity="0.25" strokeLinecap="round" />
          <path d="M48 26 Q49 33 45 35" stroke={dark} strokeWidth="2" fill="none" opacity="0.25" strokeLinecap="round" />
        </>
      )}
      {ears === 'round' && (
        <>
          <circle cx="16" cy="20" r="7" fill={color} />
          <circle cx="48" cy="20" r="7" fill={color} />
          <circle cx="16" cy="20" r="3.5" fill={dark} opacity="0.25" />
          <circle cx="48" cy="20" r="3.5" fill={dark} opacity="0.25" />
        </>
      )}

      <ellipse cx="32" cy="37" rx="20" ry="17" fill={color} />

      {hasPatch && <path d="M26 26 Q32 20 38 26 Q34 30 30 30 Q26 29 26 26 Z" fill={dark} opacity="0.3" />}

      <ellipse cx="32" cy="44" rx="11" ry="8.5" fill={cream} />

      <circle cx="24" cy="33" r="2.6" fill={dark} />
      <circle cx="40" cy="33" r="2.6" fill={dark} />
      <circle cx="25" cy="32.2" r="0.9" fill="#fff" />
      <circle cx="41" cy="32.2" r="0.9" fill="#fff" />

      <ellipse cx="32" cy="41.5" rx="3.4" ry="2.6" fill={dark} />

      <path d="M28 45 Q32 49 36 45" stroke={dark} strokeWidth="1.6" fill="none" strokeLinecap="round" />

      {hasTongue && <path d="M30 46 Q30 50 32 50.5 Q34 50 34 46 Z" fill="#E77B8F" />}
    </svg>
  );
};
