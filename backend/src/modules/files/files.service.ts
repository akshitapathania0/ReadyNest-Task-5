import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/AppError';
import { io } from '../../index';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// ── Upload file to Cloudinary then persist metadata ───────────────────────
export async function uploadFile(
  tenantId: string,
  userId: string,
  file: Express.Multer.File,
  options: { projectId?: string; folder?: string; visibility?: string }
) {
  const folder = `nexaos/${tenantId}/${options.folder || 'root'}`;

  // Upload buffer to Cloudinary via stream
  const cloudinaryResult = await new Promise<{ public_id: string; secure_url: string; bytes: number }>(
    (resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
          transformation: file.mimetype.startsWith('image/')
            ? [{ quality: 'auto:good', fetch_format: 'auto' }]
            : undefined,
        },
        (error, result) => {
          if (error || !result) return reject(error || new Error('Upload failed'));
          resolve(result as any);
        }
      );
      Readable.from(file.buffer).pipe(stream);
    }
  );

  const saved = await prisma.file.create({
    data: {
      tenantId,
      uploadedById: userId,
      projectId: options.projectId,
      name: cloudinaryResult.public_id.split('/').pop() || file.originalname,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      cloudinaryId: cloudinaryResult.public_id,
      cloudinaryUrl: cloudinaryResult.secure_url,
      folder: options.folder || 'root',
      visibility: options.visibility || 'workspace',
    },
    include: { uploadedBy: { select: { id: true, name: true } } },
  });

  // Broadcast to tenant room
  io.to(`tenant:${tenantId}`).emit('file:uploaded', {
    file: { id: saved.id, name: saved.originalName, url: saved.cloudinaryUrl },
    actor: userId,
    ts: new Date().toISOString(),
  });

  return saved;
}

// ── List files (with pagination + filtering) ──────────────────────────────
export async function listFiles(
  tenantId: string,
  query: { page?: number; limit?: number; folder?: string; search?: string; mimeType?: string }
) {
  const { page = 1, limit = 20, folder, search, mimeType } = query;

  const where: any = {
    tenantId,
    ...(folder && { folder }),
    ...(mimeType && { mimeType: { startsWith: mimeType } }),
    ...(search && { originalName: { contains: search, mode: 'insensitive' } }),
  };

  const [total, files] = await prisma.$transaction([
    prisma.file.count({ where }),
    prisma.file.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { uploadedBy: { select: { id: true, name: true } } },
    }),
  ]);

  return {
    data: files,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

// ── Delete file from Cloudinary + DB ─────────────────────────────────────
export async function deleteFile(tenantId: string, fileId: string, userId: string) {
  const file = await prisma.file.findFirst({ where: { id: fileId, tenantId } });
  if (!file) throw new AppError('File not found', 404);

  // Delete from Cloudinary
  await cloudinary.uploader.destroy(file.cloudinaryId, { resource_type: 'auto' });

  // Delete from DB
  await prisma.file.delete({ where: { id: fileId } });

  io.to(`tenant:${tenantId}`).emit('file:deleted', { fileId, actor: userId, ts: new Date().toISOString() });
}

// ── Generate signed upload URL (client-side direct upload) ────────────────
export async function getSignedUploadUrl(tenantId: string, folder?: string) {
  const timestamp = Math.round(Date.now() / 1000);
  const uploadFolder = `nexaos/${tenantId}/${folder || 'root'}`;

  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder: uploadFolder },
    process.env.CLOUDINARY_API_SECRET!
  );

  return {
    signature,
    timestamp,
    folder: uploadFolder,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
  };
}
