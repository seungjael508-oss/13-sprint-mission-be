import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { nanoid } from 'nanoid';
import sharp from 'sharp';

const uploadDirectory = path.resolve(process.cwd(), 'uploads');
const allowedExtensions = {
  png: 'png',
  jpeg: 'jpg',
  gif: 'gif',
  webp: 'webp',
} as const;

type AllowedFormat = keyof typeof allowedExtensions;

function isAllowedFormat(format: string | undefined): format is AllowedFormat {
  return format !== undefined && format in allowedExtensions;
}

async function detectDecodedImageFormat(bytes: Buffer): Promise<AllowedFormat> {
  try {
    const image = sharp(bytes, {
      failOn: 'error',
      limitInputPixels: 40_000_000,
      sequentialRead: true,
    });
    const metadata = await image.metadata();
    if (!isAllowedFormat(metadata.format)) throw new Error('Unsupported image format');
    await image.stats();
    return metadata.format;
  } catch {
    throw new Error('올바른 PNG, JPEG, GIF 또는 WebP 이미지 파일만 업로드할 수 있습니다.');
  }
}

export async function storeUploadedImage(bytes: Buffer): Promise<string> {
  const format = await detectDecodedImageFormat(bytes);
  const filename = `${nanoid()}.${allowedExtensions[format]}`;
  await mkdir(uploadDirectory, { recursive: true });
  await writeFile(path.join(uploadDirectory, filename), bytes, { flag: 'wx' });
  return filename;
}
