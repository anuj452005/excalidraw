import { Router } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Helper to verify page ownership
async function verifyPageOwnership(pageId: string, userId: string): Promise<boolean> {
    const page = await prisma.page.findFirst({
        where: { id: pageId, userId }
    });
    return !!page;
}

// Get all blocks for a page
router.get('/page/:pageId', async (req: AuthRequest, res) => {
    try {
        const { pageId } = req.params;

        const hasAccess = await verifyPageOwnership(pageId, req.userId!);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const blocks = await prisma.block.findMany({
            where: { pageId },
            orderBy: { orderIndex: 'asc' }
        });

        res.json({ blocks });
    } catch (error) {
        console.error('Get blocks error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create block
router.post('/', async (req: AuthRequest, res) => {
    try {
        const { pageId, type, content, orderIndex } = req.body;

        const hasAccess = await verifyPageOwnership(pageId, req.userId!);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const block = await prisma.block.create({
            data: {
                pageId,
                type,
                content: content || {},
                orderIndex: orderIndex ?? 0
            }
        });

        res.status(201).json({ block });
    } catch (error) {
        console.error('Create block error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update block
router.put('/:id', async (req: AuthRequest, res) => {
    try {
        const { content, orderIndex, type } = req.body;

        // Get block and verify ownership
        const existingBlock = await prisma.block.findUnique({
            where: { id: req.params.id },
            include: { page: true }
        });

        if (!existingBlock || existingBlock.page.userId !== req.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const block = await prisma.block.update({
            where: { id: req.params.id },
            data: {
                ...(content !== undefined && { content }),
                ...(orderIndex !== undefined && { orderIndex }),
                ...(type !== undefined && { type })
            }
        });

        res.json({ block });
    } catch (error) {
        console.error('Update block error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete block
router.delete('/:id', async (req: AuthRequest, res) => {
    try {
        // Get block and verify ownership
        const existingBlock = await prisma.block.findUnique({
            where: { id: req.params.id },
            include: { page: true }
        });

        if (!existingBlock || existingBlock.page.userId !== req.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        await prisma.block.delete({
            where: { id: req.params.id }
        });

        res.json({ message: 'Block deleted successfully' });
    } catch (error) {
        console.error('Delete block error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Reorder blocks
router.put('/reorder/:pageId', async (req: AuthRequest, res) => {
    try {
        const { pageId } = req.params;
        const { blockOrders } = req.body; // [{ id: string, orderIndex: number }]

        const hasAccess = await verifyPageOwnership(pageId, req.userId!);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Update all block orders in a transaction
        await prisma.$transaction(
            blockOrders.map((block: { id: string; orderIndex: number }) =>
                prisma.block.update({
                    where: { id: block.id },
                    data: { orderIndex: block.orderIndex }
                })
            )
        );

        const blocks = await prisma.block.findMany({
            where: { pageId },
            orderBy: { orderIndex: 'asc' }
        });

        res.json({ blocks });
    } catch (error) {
        console.error('Reorder blocks error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
