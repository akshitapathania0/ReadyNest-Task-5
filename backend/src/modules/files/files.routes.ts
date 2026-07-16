import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { authenticate, requireRole } from '../../middleware/auth';
import * as filesService from './files.service';
import { logAudit } from '../audit/audit.service';
import { AppError } from '../../utils/AppError';

const router = Router();
router.use(authenticate);

// Store uploads in memory (buffer) — streamed straight to Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'video/mp4', 'video/quicktime',
      'application/zip', 'application/x-zip-compressed',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain', 'text/csv',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(`File type ${file.mimetype} is not allowed`, 400) as any);
    }
  },
});

// GET /api/files
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, folder, search, mimeType } = req.query as Record<string, string>;
    const result = await filesService.listFiles(req.user!.tenantId, {
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      folder, search, mimeType,
    });
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
});

// POST /api/files — upload file
router.post('/', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new AppError('No file provided', 400);
    const { projectId, folder, visibility } = req.body;
    const file = await filesService.uploadFile(req.user!.tenantId, req.user!.userId, req.file,
      { projectId, folder, visibility });
    await logAudit({ tenantId: req.user!.tenantId, userId: req.user!.userId,
      action: 'file.upload', resource: 'file', resourceId: file.id,
      details: { name: file.originalName, size: file.size, folder }, req });
    res.status(201).json({ success: true, data: file });
  } catch (err) { next(err); }
});

// POST /api/files/signed-url — get signed URL for direct client upload
router.post('/signed-url', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { folder } = req.body;
    const result = await filesService.getSignedUploadUrl(req.user!.tenantId, folder);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// DELETE /api/files/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await filesService.deleteFile(req.user!.tenantId, req.params.id, req.user!.userId);
    await logAudit({ tenantId: req.user!.tenantId, userId: req.user!.userId,
      action: 'file.delete', resource: 'file', resourceId: req.params.id, req });
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
