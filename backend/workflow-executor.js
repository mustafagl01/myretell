export class WorkflowExecutor {
  constructor(workflow, context = {}) {
    this.workflow = workflow || { nodes: [], edges: [] };
    this.context = context;
    this.currentNodeId = this.findStartNode();
    this.visitedNodes = new Set();
  }

  findStartNode() {
    const startNode = this.workflow.nodes.find((n) => n.type === 'start');
    return startNode?.id || null;
  }

  async executeNext(userMessage) {
    if (!this.currentNodeId) return null;

    if (this.visitedNodes.has(this.currentNodeId) && this.visitedNodes.size > 50) {
      return { error: 'Workflow execution limit reached', shouldContinue: false };
    }
    this.visitedNodes.add(this.currentNodeId);

    const node = this.workflow.nodes.find((n) => n.id === this.currentNodeId);
    if (!node) return null;

    switch (node.type) {
      case 'start':
        return this.executeStartNode(node);
      case 'prompt':
        return this.executePromptNode(node, userMessage);
      case 'condition':
        return this.executeConditionNode(node, userMessage);
      case 'api':
        return this.executeApiNode(node);
      case 'setVariable':
        return this.executeSetVariableNode(node);
      case 'webhook':
        return this.executeWebhookNode(node);
      case 'transfer':
        return this.executeTransferNode(node);
      case 'end':
        return this.executeEndNode(node);
      default:
        this.moveToNextNode(node.id);
        return { type: 'unknown', shouldContinue: true };
    }
  }

  async executeStartNode(node) {
    this.moveToNextNode(node.id);
    return { type: 'greeting', message: node.data?.greeting || 'Hello!', shouldContinue: true };
  }

  async executePromptNode(node, userMessage) {
    const response = await this.callLLM({
      model: node.data?.model || 'gemini-2.0-flash',
      systemPrompt: node.data?.systemPrompt || 'You are a helpful assistant.',
      userMessage,
      temperature: node.data?.temperature || 0.7,
      context: this.context,
    });

    this.context.lastResponse = response;
    this.moveToNextNode(node.id);
    return { type: 'response', message: response, shouldContinue: true };
  }

  async executeConditionNode(node, userMessage) {
    const conditionMet = this.evaluateCondition(node.data?.condition || 'false');

    const edge = this.workflow.edges.find(
      (e) => e.source === node.id && e.sourceHandle === (conditionMet ? 'true' : 'false'),
    );

    this.currentNodeId = edge?.target || null;
    return this.executeNext(userMessage);
  }

  async executeApiNode(node) {
    const method = node.data?.method || 'POST';
    const url = this.replaceVariables(node.data?.url || '');
    const headers = this.replaceVariablesInObject(node.data?.headers || {});
    const body = this.replaceVariablesInObject(node.data?.body || {});

    const response = await this.httpRequest({
      method,
      url,
      headers,
      body: method === 'GET' ? undefined : body,
      timeoutMs: 10000,
    });

    this.context.apiResponse = response;
    this.moveToNextNode(node.id);
    return { type: 'api_success', data: response, shouldContinue: true };
  }

  async executeSetVariableNode(node) {
    const variableName = node.data?.variableName;
    if (variableName) {
      this.context[variableName] = this.replaceVariables(node.data?.variableValue || '');
    }
    this.moveToNextNode(node.id);
    return { type: 'variable_set', variable: variableName, shouldContinue: true };
  }

  async executeWebhookNode(node) {
    try {
      await this.httpRequest({
        method: node.data?.method || 'POST',
        url: this.replaceVariables(node.data?.url || ''),
        body: this.replaceVariablesInObject(node.data?.payload || {}),
        timeoutMs: 5000,
      });
    } catch (error) {
      console.error('[Workflow] Webhook failed:', error.message);
    }

    this.moveToNextNode(node.id);
    return { type: 'webhook_sent', shouldContinue: true };
  }

  async executeTransferNode(node) {
    return {
      type: 'transfer',
      phoneNumber: this.replaceVariables(node.data?.phoneNumber || ''),
      department: node.data?.department || 'General',
      shouldContinue: false,
    };
  }

  async executeEndNode(node) {
    this.currentNodeId = null;
    return { type: 'end_call', message: node.data?.message || 'Goodbye!', shouldContinue: false };
  }

  moveToNextNode(nodeId) {
    const edge = this.workflow.edges.find((e) => e.source === nodeId);
    this.currentNodeId = edge?.target || null;
  }

  evaluateCondition(condition) {
    try {
      const fn = new Function('context', `with(context) { return ${condition}; }`);
      return Boolean(fn(this.context));
    } catch {
      return false;
    }
  }

  replaceVariables(text) {
    if (typeof text !== 'string') return text;
    return text.replace(/\{\{(\w+)\}\}/g, (match, name) => this.context[name] ?? match);
  }

  replaceVariablesInObject(obj) {
    if (Array.isArray(obj)) return obj.map((item) => this.replaceVariablesInObject(item));
    if (!obj || typeof obj !== 'object') return this.replaceVariables(obj);

    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [key, this.replaceVariablesInObject(value)]),
    );
  }


  async httpRequest({ method = 'GET', url, headers = {}, body, timeoutMs = 10000 }) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const text = await response.text();
      return text ? JSON.parse(text) : {};
    } finally {
      clearTimeout(timer);
    }
  }

  async callLLM({ userMessage }) {
    return `AI response to: ${userMessage}`;
  }
}

export default WorkflowExecutor;
