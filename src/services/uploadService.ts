import { supabase } from '../lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

// Bucket público no Supabase Storage (ver supabase_chat_media.sql).
const BUCKET = 'chat-media';

const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', heic: 'image/heic',
  pdf: 'application/pdf', doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  txt: 'text/plain',
  m4a: 'audio/mp4', mp3: 'audio/mpeg', wav: 'audio/wav', aac: 'audio/aac', ogg: 'audio/ogg',
  mp4: 'video/mp4', mov: 'video/quicktime',
};

const extFrom = (uriOrName: string, fallback = 'bin') => {
  const clean = uriOrName.split('?')[0];
  const parts = clean.split('.');
  const ext = parts.length > 1 ? parts.pop()!.toLowerCase() : fallback;
  return ext || fallback;
};

/**
 * Lê um ficheiro local (file://) e envia-o para o Storage do Supabase.
 * Devolve o URL público permanente. Requer sessão autenticada + policies do bucket.
 */
export async function uploadToChatMedia(params: {
  uri: string;
  userId: string;
  contentType?: string;
  ext?: string;
}): Promise<string> {
  const { uri, userId } = params;
  const ext = (params.ext || extFrom(uri)).toLowerCase();
  const contentType = params.contentType || CONTENT_TYPES[ext] || 'application/octet-stream';

  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
  const arrayBuffer = decode(base64);

  const path = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, arrayBuffer, { contentType, upsert: false });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
