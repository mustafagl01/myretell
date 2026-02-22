import React, { useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './WorkflowEditor.css';
import { DashboardLayout } from '../components/DashboardLayout';

import StartNode from '../components/workflow/StartNode';
import PromptNode from '../components/workflow/PromptNode';
import ConditionNode from '../components/workflow/ConditionNode';
import ApiNode from '../components/workflow/ApiNode';
import EndNode from '../components/workflow/EndNode';
import TransferNode from '../components/workflow/TransferNode';
import SetVariableNode from '../components/workflow/SetVariableNode';
import WebhookNode from '../components/workflow/WebhookNode';

const nodeTypes = {
  start: StartNode,
  prompt: PromptNode,
  condition: ConditionNode,
  api: ApiNode,
  end: EndNode,
  transfer: TransferNode,
  setVariable: SetVariableNode,
  webhook: WebhookNode,
};

const renderNodeConfig = (node) => (
  <div className="config-group">
    <label>Configuration</label>
    <pre>{JSON.stringify(node.data, null, 2)}</pre>
  </div>
);

export const WorkflowEditor = ({ user, onLogout }) => {
  const { agentId } = useParams();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  const updateNodeData = useCallback((nodeId, field, value) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              [field]: value,
            },
          };
        }
        return node;
      }),
    );
  }, [setNodes]);

  const hydrateNode = useCallback((node) => ({
    ...node,
    data: {
      ...(node.data || {}),
      onChange: (field, value) => updateNodeData(node.id, field, value),
    },
  }), [updateNodeData]);

  const initializeWorkflow = useCallback(() => {
    const startNode = {
      id: 'start-1',
      type: 'start',
      position: { x: 250, y: 50 },
      data: {
        greeting: 'Hello! How can I help you today?',
      },
    };

    setNodes([hydrateNode(startNode)]);
    setEdges([]);
  }, [hydrateNode, setEdges, setNodes]);

  const loadWorkflow = useCallback(async () => {
    if (!agentId) return;

    try {
      const response = await fetch(`/api/agents/${agentId}/workflow`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to load workflow');
      const data = await response.json();
      const workflow = data.workflow || {};

      if (workflow.nodes?.length) {
        setNodes(workflow.nodes.map(hydrateNode));
        setEdges(workflow.edges || []);
      } else {
        initializeWorkflow();
      }
    } catch (error) {
      console.error('Failed to load workflow:', error);
      initializeWorkflow();
    }
  }, [agentId, hydrateNode, initializeWorkflow, setEdges, setNodes]);

  useEffect(() => {
    loadWorkflow();
  }, [loadWorkflow]);

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const getDefaultNodeData = (type, nodeId) => {
    const baseData = { onChange: (field, value) => updateNodeData(nodeId, field, value) };

    switch (type) {
      case 'prompt':
        return { ...baseData, label: 'AI Assistant', systemPrompt: 'You are a helpful assistant.', model: 'gemini-2.0-flash', temperature: 0.7 };
      case 'condition':
        return { ...baseData, label: 'Check Condition', condition: 'intent === "booking"', description: 'Route based on condition' };
      case 'api':
        return { ...baseData, label: 'API Call', method: 'POST', url: 'https://api.example.com/endpoint', headers: {}, body: {} };
      case 'end':
        return { ...baseData, message: 'Thank you for contacting us. Goodbye!' };
      case 'transfer':
        return { ...baseData, label: 'Transfer Call', phoneNumber: '', department: 'Sales' };
      case 'setVariable':
        return { ...baseData, label: 'Set Variable', variableName: 'userName', variableValue: '{{userInput}}' };
      case 'webhook':
        return { ...baseData, label: 'Send Webhook', url: 'https://webhook.site/...', method: 'POST', payload: {} };
      default:
        return baseData;
    }
  };

  const addNode = (type) => {
    const newNodeId = `${type}-${Date.now()}`;
    setNodes((nds) => [
      ...nds,
      {
        id: newNodeId,
        type,
        position: { x: Math.random() * 300 + 200, y: Math.random() * 300 + 200 },
        data: getDefaultNodeData(type, newNodeId),
      },
    ]);
  };

  const onSave = async () => {
    setLoading(true);
    setSaveStatus('Saving...');

    try {
      const workflow = {
        version: 1,
        nodes: nodes.map((node) => ({
          ...node,
          data: Object.fromEntries(Object.entries(node.data || {}).filter(([key]) => key !== 'onChange')),
        })),
        edges,
        variables: {},
      };

      const response = await fetch(`/api/agents/${agentId}/workflow`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ workflowJson: workflow, enabled: true }),
      });

      setSaveStatus(response.ok ? '✓ Saved successfully' : '✗ Save failed');
      if (response.ok) setTimeout(() => setSaveStatus(''), 2000);
    } catch (error) {
      console.error('Save error:', error);
      setSaveStatus('✗ Save failed');
    } finally {
      setLoading(false);
    }
  };

  const deleteNode = (nodeId) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    if (selectedNode?.id === nodeId) setSelectedNode(null);
  };

  return (
    <DashboardLayout user={user} onLogout={onLogout} title="Workflow Editor" hideContentPadding>
      <div className="workflow-editor-container">
        <div className="workflow-toolbar">
          <div className="toolbar-left"><h2>Workflow Editor</h2><span className="agent-name">Agent: {agentId || 'Select an agent'}</span></div>
          <div className="toolbar-center">
            <button className="btn-add-node" onClick={() => addNode('prompt')}>💬 Prompt</button>
            <button className="btn-add-node" onClick={() => addNode('condition')}>🔀 Condition</button>
            <button className="btn-add-node" onClick={() => addNode('api')}>🔌 API</button>
            <button className="btn-add-node" onClick={() => addNode('setVariable')}>📝 Variable</button>
            <button className="btn-add-node" onClick={() => addNode('webhook')}>🪝 Webhook</button>
            <button className="btn-add-node" onClick={() => addNode('transfer')}>📞 Transfer</button>
            <button className="btn-add-node" onClick={() => addNode('end')}>🏁 End</button>
          </div>
          <div className="toolbar-right">{saveStatus && <span className="save-status">{saveStatus}</span>}<button className="btn-save" onClick={onSave} disabled={loading}>{loading ? 'Saving...' : '💾 Save Workflow'}</button></div>
        </div>

        <div className="workflow-canvas">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => setSelectedNode(node)}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid
            snapGrid={[15, 15]}
          >
            <Controls />
            <MiniMap />
            <Background variant="dots" gap={15} size={1} />
            <Panel position="top-left" className="workflow-info">
              <div className="info-stat"><span className="info-label">Nodes:</span><span className="info-value">{nodes.length}</span></div>
              <div className="info-stat"><span className="info-label">Connections:</span><span className="info-value">{edges.length}</span></div>
            </Panel>
          </ReactFlow>
        </div>

        {selectedNode && (
          <div className="node-config-panel">
            <div className="panel-header"><h3>Configure Node</h3><button className="btn-close" onClick={() => setSelectedNode(null)}>✕</button></div>
            <div className="panel-body">
              <div className="config-group"><label>Node ID</label><input type="text" value={selectedNode.id} disabled /></div>
              <div className="config-group"><label>Node Type</label><input type="text" value={selectedNode.type} disabled /></div>
              {renderNodeConfig(selectedNode)}
            </div>
            <div className="panel-footer"><button className="btn-delete" onClick={() => deleteNode(selectedNode.id)}>🗑 Delete Node</button></div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default WorkflowEditor;
