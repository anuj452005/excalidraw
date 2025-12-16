import { Router } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get all folders with nested structure
router.get('/', async (req: AuthRequest, res) => {
    try {
        const folders = await prisma.folder.findMany({
            where: { userId: req.userId },
            include: {
                pages: {
                    select: { id: true, title: true, updatedAt: true }
                },
                _count: { select: { children: true } }
            },
            orderBy: { name: 'asc' }
        });

        // Build tree structure
        const folderMap = new Map();
        const rootFolders: any[] = [];

        folders.forEach(folder => {
            folderMap.set(folder.id, { ...folder, children: [] });
        });

        folders.forEach(folder => {
            const folderWithChildren = folderMap.get(folder.id);
            if (folder.parentId && folderMap.has(folder.parentId)) {
                folderMap.get(folder.parentId).children.push(folderWithChildren);
            } else {
                rootFolders.push(folderWithChildren);
            }
        });

        res.json({ folders: rootFolders });
    } catch (error) {
        console.error('Get folders error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create folder
router.post('/', async (req: AuthRequest, res) => {
    try {
        const { name, parentId } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Folder name is required' });
        }

        // Verify parent folder ownership if provided
        if (parentId) {
            const parentFolder = await prisma.folder.findFirst({
                where: { id: parentId, userId: req.userId }
            });
            if (!parentFolder) {
                return res.status(403).json({ error: 'Access denied' });
            }
        }

        const folder = await prisma.folder.create({
            data: {
                name,
                parentId: parentId || null,
                userId: req.userId!
            }
        });

        res.status(201).json({ folder });
    } catch (error) {
        console.error('Create folder error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update folder
router.put('/:id', async (req: AuthRequest, res) => {
    try {
        const { name, parentId } = req.body;

        const folder = await prisma.folder.updateMany({
            where: { id: req.params.id, userId: req.userId },
            data: {
                ...(name && { name }),
                ...(parentId !== undefined && { parentId: parentId || null })
            }
        });

        if (folder.count === 0) {
            return res.status(404).json({ error: 'Folder not found' });
        }

        const updatedFolder = await prisma.folder.findUnique({
            where: { id: req.params.id }
        });

        res.json({ folder: updatedFolder });
    } catch (error) {
        console.error('Update folder error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete folder
router.delete('/:id', async (req: AuthRequest, res) => {
    try {
        const folder = await prisma.folder.deleteMany({
            where: { id: req.params.id, userId: req.userId }
        });

        if (folder.count === 0) {
            return res.status(404).json({ error: 'Folder not found' });
        }

        res.json({ message: 'Folder deleted successfully' });
    } catch (error) {
        console.error('Delete folder error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Move page to folder
router.put('/move-page/:pageId', async (req: AuthRequest, res) => {
    try {
        const { folderId } = req.body;

        // Verify page ownership
        const page = await prisma.page.findFirst({
            where: { id: req.params.pageId, userId: req.userId }
        });

        if (!page) {
            return res.status(404).json({ error: 'Page not found' });
        }

        // Verify folder ownership if provided
        if (folderId) {
            const folder = await prisma.folder.findFirst({
                where: { id: folderId, userId: req.userId }
            });
            if (!folder) {
                return res.status(403).json({ error: 'Access denied' });
            }
        }

        const updatedPage = await prisma.page.update({
            where: { id: req.params.pageId },
            data: { folderId: folderId || null }
        });

        res.json({ page: updatedPage });
    } catch (error) {
        console.error('Move page error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
