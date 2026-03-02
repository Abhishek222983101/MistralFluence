export interface PhotoManifestItem {
  id: string;
  src: string;
}

export const PHOTO_MANIFEST: PhotoManifestItem[] = Array.from({ length: 120 }, (_, index) => ({
  id: `photo-${index + 1}`,
  src: `/avatars/avatar-${String(index + 1).padStart(3, '0')}.jpg`
}));
