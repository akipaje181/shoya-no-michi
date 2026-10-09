"use client";
// 写真・動画の実体は IndexedDB に保存（localStorage には入らない大きさのため）
const DB_NAME = "shoya-road-media";
const STORE = "blobs";

export const MAX_PHOTO = 15 * 1024 * 1024; // 15MB
export const MAX_VIDEO = 200 * 1024 * 1024; // 200MB
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/heic", "image/heif", "image/webp", "image/gif"];
export const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/x-m4v"];

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putBlob(id: string, blob: Blob): Promise<void> {
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getBlob(id: string): Promise<Blob | null> {
  const db = await open();
  const v = await new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve((req.result as Blob) || null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return v;
}

export async function deleteBlob(id: string): Promise<void> {
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function clearBlobs(): Promise<void> {
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export function validateFile(f: File): { ok: true; kind: "photo" | "video" } | { ok: false; reason: string } {
  const t = f.type.toLowerCase();
  if (PHOTO_TYPES.includes(t) || (t === "" && /\.(jpe?g|png|heic|webp)$/i.test(f.name))) {
    if (f.size > MAX_PHOTO) return { ok: false, reason: "写真が大きすぎます（15MBまで）" };
    return { ok: true, kind: "photo" };
  }
  if (VIDEO_TYPES.includes(t) || (t === "" && /\.(mp4|mov|m4v|webm)$/i.test(f.name))) {
    if (f.size > MAX_VIDEO) return { ok: false, reason: "動画が大きすぎます（200MBまで）" };
    return { ok: true, kind: "video" };
  }
  return { ok: false, reason: "写真（JPEG/PNG/HEIC）か動画（MP4/MOV）を選んでください" };
}

/** 写真は長辺 1600px に縮小して保存（容量対策）。HEIC など読めない形式はそのまま */
export async function shrinkPhoto(f: File): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return f;
  try {
    const bmp = await createImageBitmap(f);
    const max = 1600;
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    if (scale === 1 && f.size < 2 * 1024 * 1024) return f;
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise<Blob>((res) => c.toBlob((b) => res(b || f), "image/jpeg", 0.86));
  } catch {
    return f;
  }
}
