/**
 * WorkflowExecutor - Runtime engine for visual workflows
 * Interprets the JSON workflow graph and executes nodes sequentially.
 */
export class WorkflowExecutor {
    constructor(workflow, context = {}) {
        this.workflow = workflow;
        this.context = { ...context };
        this.currentNodeId = this.findStartNode();
        this.executionCount = 0;
        this.maxExecutions = 100; // Safety limit
    }

    findStartNode() {
        const startNode = this.workflow.nodes.find(n => n.type === 'start');
        return startNode?.id || null;
    }

    /**
     * Execute the next node in the workflow given user input
     * @param {string} userMessage - The user's spoken/typed message
     * @returns {Object|null} Result of node execution
     */
    async executeNext(userMessage) {
        if (!this.currentNodeId) {
            return null;
        }

        this.executionCount++;
        if (this.executionCount > this.maxExecutions) {
            console.error('[Workflow] Execution limit reached, stopping');
            return { type: 'error', message: 'Workflow execution limit reached', shouldContinue: false };
        }

        const node = this.workflow.nodes.find(n => n.id === this.currentNodeId);
        if (!node) {
            console.error('[Workflow] Node not found:', this.currentNodeId);
            return null;
        }

        console.log(`[Workflow] Executing: ${node.type} (${node.id})`);

        try {
            switch (node.type) {
                case 'start': return this._executeStart(node);
                case 'prompt': return this._executePrompt(node, userMessage);
                case 'condition': return await this._executeCondition(node, userMessage);
                case 'api': return await this._executeApi(node);
                case 'setVariable': return this._executeSetVariable(node);
                case 'webhook': return await this._executeWebhook(node);
                case 'transfer': return this._executeTransfer(node);
                case 'end': return this._executeEnd(node);
                default:
                    console.warn('[Workflow] Unknown node type:', node.type);
                    this._moveToNext(node.id);
                    return { type: 'unknown', shouldContinue: true };
            }
        } catch (error) {
            console.error(`[Workflow] Error in node ${node.id}:`, error.message);
            return { type: 'error', message: error.message, shouldContinue: false };
        }
    }

    _executeStart(node) {
        this._moveToNext(node.id);
        return {
            type: 'greeting',
            message: node.data?.greeting || 'Hello!',
            shouldContinue: true
        };
    }

    _executePrompt(node, userMessage) {
        // Return the prompt config — the WebSocket handler will route this to the LLM
        const promptConfig = {
            systemPrompt: node.data?.systemPrompt || 'You are a helpful assistant.',
            model: node.data?.model || 'gemini-2.0-flash',
            temperature: node.data?.temperature ?? 0.7,
        };

        this._moveToNext(node.id);

        return {
            type: 'prompt',
            config: promptConfig,
            userMessage,
            context: { ...this.context },
            shouldContinue: true
        };
    }

    async _executeCondition(node, userMessage) {
        const condition = node.data?.condition || 'false';
        let result = false;

        try {
            // Simple safe evaluation with context variables
            const fn = new Function('context', 'userMessage', `
                with(context) { 
                    try { return !!(${condition}); } 
                    catch { return false; } 
                }
            `);
            result = fn(this.context, userMessage);
        } catch (err) {
            console.warn('[Workflow] Condition eval failed:', err.message);
        }

        console.log(`[Workflow] Condition "${condition}" → ${result}`);

        // Find the right branch edge
        const edge = this.workflow.edges.find(e =>
            e.source === node.id && e.sourceHandle === (result ? 'true' : 'false')
        );

        this.currentNodeId = edge?.target || null;

        // Auto-execute next node in condition chains
        if (this.currentNodeId) {
            return await this.executeNext(userMessage);
        }

        return { type: 'condition_dead_end', shouldContinue: false };
    }

    async _executeApi(node) {
        const { method, url, headers, body } = node.data || {};

        try {
            const processedUrl = this._replaceVars(url || '');
            const processedHeaders = this._replaceVarsInObj(
                typeof headers === 'string' ? JSON.parse(headers) : (headers || {})
            );
            const processedBody = this._replaceVarsInObj(
                typeof body === 'string' ? JSON.parse(body) : (body || {})
            );

            console.log(`[Workflow] API: ${method || 'POST'} ${processedUrl}`);

            const fetchOpts = {
                method: method || 'POST',
                headers: { 'Content-Type': 'application/json', ...processedHeaders },
            };
            if (method !== 'GET') {
                fetchOpts.body = JSON.stringify(processedBody);
            }

            const response = await fetch(processedUrl, fetchOpts);
            const data = await response.json().catch(() => ({}));

            this.context.apiResponse = data;
            this.context.apiStatus = response.status;

            this._moveToNext(node.id);

            return { type: 'api_result', data, status: response.status, shouldContinue: true };
        } catch (error) {
            console.error('[Workflow] API call failed:', error.message);
            this.context.apiError = error.message;
            this._moveToNext(node.id);
            return { type: 'api_error', error: error.message, shouldContinue: true };
        }
    }

    _executeSetVariable(node) {
        const name = node.data?.variableName || 'var';
        const value = this._replaceVars(node.data?.variableValue || '');

        this.context[name] = value;
        console.log(`[Workflow] Variable set: ${name} = ${value}`);

        this._moveToNext(node.id);
        return { type: 'variable_set', variable: name, value, shouldContinue: true };
    }

    async _executeWebhook(node) {
        const { url, method, payload } = node.data || {};

        try {
            const processedUrl = this._replaceVars(url || '');
            const processedPayload = this._replaceVarsInObj(
                typeof payload === 'string' ? JSON.parse(payload) : (payload || {})
            );

            await fetch(processedUrl, {
                method: method || 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(processedPayload),
            });

            console.log(`[Workflow] Webhook sent to ${processedUrl}`);
        } catch (error) {
            console.warn('[Workflow] Webhook failed (non-blocking):', error.message);
        }

        this._moveToNext(node.id);
        return { type: 'webhook_sent', shouldContinue: true };
    }

    _executeTransfer(node) {
        return {
            type: 'transfer',
            phoneNumber: this._replaceVars(node.data?.phoneNumber || ''),
            department: node.data?.department || 'General',
            shouldContinue: false
        };
    }

    _executeEnd(node) {
        this.currentNodeId = null;
        return {
            type: 'end_call',
            message: node.data?.message || 'Goodbye!',
            shouldContinue: false
        };
    }

    // ── Helpers ──

    _moveToNext(currentNodeId) {
        const edge = this.workflow.edges.find(e => e.source === currentNodeId && !e.sourceHandle);
        if (!edge) {
            // Try without sourceHandle filter (for non-condition nodes)
            const anyEdge = this.workflow.edges.find(e => e.source === currentNodeId);
            this.currentNodeId = anyEdge?.target || null;
        } else {
            this.currentNodeId = edge.target;
        }
    }

    _replaceVars(text) {
        if (typeof text !== 'string') return text;
        return text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
            return this.context[varName] !== undefined ? this.context[varName] : match;
        });
    }

    _replaceVarsInObj(obj) {
        if (typeof obj !== 'object' || obj === null) return obj;
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string') result[key] = this._replaceVars(value);
            else if (typeof value === 'object' && value !== null) result[key] = this._replaceVarsInObj(value);
            else result[key] = value;
        }
        return result;
    }

    get isComplete() {
        return this.currentNodeId === null;
    }
}

export default WorkflowExecutor;
