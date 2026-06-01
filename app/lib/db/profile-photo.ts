import supabase from "../supabase";
import { PACIENTE_DOCUMENTOS_BUCKET } from "./documentos";

export const PROFILE_PHOTOS_BUCKET = PACIENTE_DOCUMENTOS_BUCKET;
export const PROFILE_PHOTO_MAX_SIZE = 5 * 1024 * 1024;
const PROFILE_PHOTO_SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7;
const PROFILE_PHOTO_CACHE_PREFIX = "psicodesk-profile-photo:";

type UserMetadata = Record<string, unknown>;
type CachedProfilePhoto = {
  path: string;
  signedUrl: string;
  expiresAt: number;
};

function extensaoDaFoto(file: File) {
  const porTipo: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

  if (porTipo[file.type]) return porTipo[file.type];

  const ext = file.name.split(".").pop()?.toLowerCase();
  return ext && ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
}

export function getProfilePhotoPath(metadata: UserMetadata | null | undefined) {
  const path = metadata?.avatar_path;
  return typeof path === "string" ? path : "";
}

function getCachedProfilePhotoUrl(path: string) {
  if (typeof window === "undefined" || !path) return "";

  try {
    const raw = window.localStorage.getItem(`${PROFILE_PHOTO_CACHE_PREFIX}${path}`);
    if (!raw) return "";

    const cached = JSON.parse(raw) as CachedProfilePhoto;
    if (
      cached.path === path &&
      cached.signedUrl &&
      cached.expiresAt > Date.now() + 60_000
    ) {
      return cached.signedUrl;
    }
  } catch {
    return "";
  }

  return "";
}

function cacheProfilePhotoUrl(path: string, signedUrl: string) {
  if (typeof window === "undefined" || !path || !signedUrl) return;

  const cached: CachedProfilePhoto = {
    path,
    signedUrl,
    expiresAt: Date.now() + PROFILE_PHOTO_SIGNED_URL_TTL_SECONDS * 1000,
  };

  try {
    window.localStorage.setItem(
      `${PROFILE_PHOTO_CACHE_PREFIX}${path}`,
      JSON.stringify(cached)
    );
  } catch {
    // Cache is optional; signed URLs still work without localStorage.
  }
}

export async function criarUrlFotoPerfil(path: string) {
  if (!path) return { data: { signedUrl: "" }, error: null };

  return supabase.storage
    .from(PROFILE_PHOTOS_BUCKET)
    .createSignedUrl(path, PROFILE_PHOTO_SIGNED_URL_TTL_SECONDS);
}

export async function resolverUrlFotoPerfil(
  metadata: UserMetadata | null | undefined
) {
  const path = getProfilePhotoPath(metadata);
  if (!path) return "";

  const cachedUrl = getCachedProfilePhotoUrl(path);
  if (cachedUrl) return cachedUrl;

  const { data, error } = await criarUrlFotoPerfil(path);
  if (error) return "";
  cacheProfilePhotoUrl(path, data.signedUrl || "");
  return data.signedUrl || "";
}

export async function uploadFotoPerfil({
  userId,
  file,
  previousPath,
}: {
  userId: string;
  file: File;
  previousPath?: string;
}) {
  if (!file.type.startsWith("image/")) {
    return { path: "", error: new Error("Envie um arquivo de imagem.") };
  }

  if (file.size > PROFILE_PHOTO_MAX_SIZE) {
    return { path: "", error: new Error("A foto deve ter no máximo 5 MB.") };
  }

  const ext = extensaoDaFoto(file);
  const storagePath = `${userId}/perfil/avatar-${Date.now()}.${ext}`;

  const upload = await supabase.storage
    .from(PROFILE_PHOTOS_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",
      contentType: file.type || `image/${ext}`,
      upsert: false,
    });

  if (upload.error) return { path: "", error: upload.error };

  if (previousPath && previousPath !== storagePath) {
    await supabase.storage.from(PROFILE_PHOTOS_BUCKET).remove([previousPath]);
  }

  return { path: storagePath, error: null };
}

export async function removerFotoPerfil(path: string) {
  if (!path) return { error: null };
  return supabase.storage.from(PROFILE_PHOTOS_BUCKET).remove([path]);
}
