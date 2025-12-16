import { Router } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get all pages for current user
router.get('/', async (req: AuthRequest, res) => {
    try {
        const pages = await prisma.page.findMany({
            where: { userId: req.userId },
            orderBy: { updatedAt: 'desc' },
            include: {
                _count: { select: { blocks: true } }
            }
        });

        res.json({ pages });
    } catch (error) {
        console.error('Get pages error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get single page with blocks
router.get('/:id', async (req: AuthRequest, res) => {
    try {
        const page = await prisma.page.findFirst({
            where: {
                id: req.params.id,
                userId: req.userId
            },
            include: {
                blocks: {
                    orderBy: { orderIndex: 'asc' }
                }
            }
        });

        if (!page) {
            return res.status(404).json({ error: 'Page not found' });
        }

        res.json({ page });
    } catch (error) {
        console.error('Get page error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create page
router.post('/', async (req: AuthRequest, res) => {
    try {
        const { title } = req.body;

        const page = await prisma.page.create({
            data: {
                title: title || 'Untitled',
                userId: req.userId!
            }
        });

        res.status(201).json({ page });
    } catch (error) {
        console.error('Create page error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update page
router.put('/:id', async (req: AuthRequest, res) => {
    try {
        const { title } = req.body;

        const page = await prisma.page.updateMany({
            where: {
                id: req.params.id,
                userId: req.userId
            },
            data: { title }
        });

        if (page.count === 0) {
            return res.status(404).json({ error: 'Page not found' });
        }

        const updatedPage = await prisma.page.findUnique({
            where: { id: req.params.id }
        });

        res.json({ page: updatedPage });
    } catch (error) {
        console.error('Update page error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete page
router.delete('/:id', async (req: AuthRequest, res) => {
    try {
        const page = await prisma.page.deleteMany({
            where: {
                id: req.params.id,
                userId: req.userId
            }
        });

        if (page.count === 0) {
            return res.status(404).json({ error: 'Page not found' });
        }

        res.json({ message: 'Page deleted successfully' });
    } catch (error) {
        console.error('Delete page error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
