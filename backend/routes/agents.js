import express from 'express';
import prisma from '../config/prisma.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All agent routes require authentication
router.use(authenticateToken);

/**
 * GET /api/agents — List all agents for the authenticated user
 */
router.get('/', async (req, res) => {
    try {
        const agents = await prisma.agent.findMany({
            where: { userId: req.user.id },
            orderBy: { updatedAt: 'desc' },
            include: {
                _count: { select: { sessions: true } }
            }
        });

        res.json(agents);
    } catch (error) {
        console.error('Error listing agents:', error.message);
        res.status(500).json({ error: 'Failed to list agents' });
    }
});

/**
 * POST /api/agents — Create a new agent
 */
router.post('/', async (req, res) => {
    try {
        const { name, systemPrompt, voice, sttModel, ttsModel, llmModel, language, greeting } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Agent name is required' });
        }
        if (!systemPrompt || !systemPrompt.trim()) {
            return res.status(400).json({ error: 'System prompt is required' });
        }
        if (name.trim().length < 3 || name.trim().length > 50) {
            return res.status(400).json({ error: 'Name must be 3-50 characters' });
        }
        if (systemPrompt.trim().length < 10) {
            return res.status(400).json({ error: 'System prompt must be at least 10 characters' });
        }

        // Rate limit: max 10 agents per user
        const agentCount = await prisma.agent.count({ where: { userId: req.user.id } });
        if (agentCount >= 10) {
            return res.status(400).json({ error: 'Maximum 10 agents allowed. Delete an existing agent to create a new one.' });
        }

        const agent = await prisma.agent.create({
            data: {
                userId: req.user.id,
                name: name.trim(),
                systemPrompt: systemPrompt.trim(),
                voice: voice || 'aura-2-thalia-en',
                sttModel: sttModel || 'nova-2',
                ttsModel: ttsModel || 'eleven_multilingual_v2',
                llmModel: llmModel || 'gpt-4o-mini',
                language: language || 'en',
                greeting: greeting?.trim() || null,
                phoneNumber: req.body.phoneNumber || null,
            }
        });

        res.status(201).json(agent);
    } catch (error) {
        console.error('Detailed Error creating agent:', error);
        res.status(500).json({
            error: 'Failed to create agent',
            details: error.message,
            code: error.code // Prisma error codes are helpful
        });
    }
});

/**
 * GET /api/agents/:id — Get a single agent by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const agent = await prisma.agent.findFirst({
            where: {
                id: req.params.id,
                userId: req.user.id
            },
            include: {
                sessions: {
                    orderBy: { startTime: 'desc' },
                    take: 50
                },
                _count: { select: { sessions: true } }
            }
        });

        if (!agent) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        res.json(agent);
    } catch (error) {
        console.error('Error fetching agent:', error.message);
        res.status(500).json({ error: 'Failed to fetch agent' });
    }
});

/**
 * PUT /api/agents/:id — Update an agent
 */
router.put('/:id', async (req, res) => {
    try {
        const { name, systemPrompt, voice, sttModel, ttsModel, llmModel, language, greeting, status } = req.body;

        // Verify ownership
        const existing = await prisma.agent.findFirst({
            where: { id: req.params.id, userId: req.user.id }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        if (name && (name.trim().length < 3 || name.trim().length > 50)) {
            return res.status(400).json({ error: 'Name must be 3-50 characters' });
        }

        const updated = await prisma.agent.update({
            where: { id: req.params.id },
            data: {
                ...(name && { name: name.trim() }),
                ...(systemPrompt && { systemPrompt: systemPrompt.trim() }),
                ...(voice && { voice }),
                ...(sttModel && { sttModel }),
                ...(ttsModel && { ttsModel }),
                ...(llmModel && { llmModel }),
                ...(language && { language }),
                ...(greeting !== undefined && { greeting: greeting?.trim() || null }),
                ...(status && { status }),
            }
        });

        res.json(updated);
    } catch (error) {
        console.error('Error updating agent:', error.message);
        res.status(500).json({ error: 'Failed to update agent' });
    }
});

/**
 * DELETE /api/agents/:id — Delete an agent
 */
router.delete('/:id', async (req, res) => {
    try {
        const existing = await prisma.agent.findFirst({
            where: { id: req.params.id, userId: req.user.id }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        await prisma.agent.delete({
            where: { id: req.params.id }
        });

        res.json({ success: true, message: 'Agent deleted successfully' });
    } catch (error) {
        console.error('Error deleting agent:', error.message);
        res.status(500).json({ error: 'Failed to delete agent' });
    }
});

/**
 * GET /api/agents/:id/workflow — Get workflow for agent
 */
router.get('/:id/workflow', async (req, res) => {
    try {
        const agent = await prisma.agent.findFirst({
            where: { id: req.params.id, userId: req.user.id },
            select: { workflowJson: true, workflowEnabled: true, workflowVersion: true }
        });

        if (!agent) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        res.json({
            workflow: agent.workflowJson || { nodes: [], edges: [], variables: {} },
            enabled: agent.workflowEnabled,
            version: agent.workflowVersion
        });
    } catch (error) {
        console.error('Get workflow error:', error);
        res.status(500).json({ error: 'Failed to load workflow' });
    }
});

/**
 * PUT /api/agents/:id/workflow — Save/update workflow
 */
router.put('/:id/workflow', async (req, res) => {
    try {
        const { workflowJson, enabled } = req.body;

        if (!workflowJson || !workflowJson.nodes || !Array.isArray(workflowJson.nodes)) {
            return res.status(400).json({ error: 'Invalid workflow structure' });
        }

        const existing = await prisma.agent.findFirst({
            where: { id: req.params.id, userId: req.user.id }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        const agent = await prisma.agent.update({
            where: { id: req.params.id },
            data: {
                workflowJson,
                workflowEnabled: enabled !== undefined ? enabled : true,
                workflowVersion: { increment: 1 },
            }
        });

        res.json({
            success: true,
            workflow: agent.workflowJson,
            version: agent.workflowVersion
        });
    } catch (error) {
        console.error('Save workflow error:', error);
        res.status(500).json({ error: 'Failed to save workflow' });
    }
});

/**
 * PATCH /api/agents/:id/workflow/toggle — Toggle workflow on/off
 */
router.patch('/:id/workflow/toggle', async (req, res) => {
    try {
        const agent = await prisma.agent.findFirst({
            where: { id: req.params.id, userId: req.user.id }
        });

        if (!agent) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        const updated = await prisma.agent.update({
            where: { id: req.params.id },
            data: { workflowEnabled: !agent.workflowEnabled }
        });

        res.json({ success: true, enabled: updated.workflowEnabled });
    } catch (error) {
        console.error('Toggle workflow error:', error);
        res.status(500).json({ error: 'Failed to toggle workflow' });
    }
});

export default router;
