export type DeviceTier = 'mobile' | 'desktop';

export type SpatialMode = 'sphere' | 'transition' | 'network';

export interface AvatarProfile {
  id: string;
  displayName: string;
  handle: string;
  verified?: boolean;
  imageUrl: string;
  accent: string;
}

export interface AvatarPoint {
  x: number;
  y: number;
  z: number;
}

export interface SphereNode {
  id: string;
  profile: AvatarProfile;
  spherePoint: AvatarPoint;
  networkPoint: AvatarPoint;
  scale: number;
  hueShift: number;
}

export interface HeroMotionConfig {
  baseRotationSpeed: number;
  floatAmplitude: number;
  floatFrequency: number;
  parallaxStrength: number;
  scrollZoomStrength: number;
}

export interface SphereDistributionConfig {
  radius: number;
  jitter: number;
  minScale: number;
  maxScale: number;
}
