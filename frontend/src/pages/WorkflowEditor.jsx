import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ReactFlow,
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Panel,
    MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { DashboardLayout } from '../components/DashboardLayout';
import StartNode from '../components/workflow/StartNode';
import PromptNode from '../components/workflow/PromptNode';
import ConditionNode from '../components/workflow/ConditionNode';
import ApiNode from '../components/workflow/ApiNode';
import EndNode from '../components/workflow/EndNode';
import TransferNode from '../components/workflow/TransferNode';
import SetVariableNode from '../components/workflow/SetVariableNode';
import WebhookNode from '../components/workflow/WebhookNode';
import './WorkflowEditor.css';

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

const defaultEdgeOptions = {
    animated: true,
    style: { stroke: '#6366f1', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
};

const NODE_PALETTE = [
    { type: 'prompt', icon: '💬', label: 'Prompt' },
    { type: 'condition', icon: '🔀', label: 'Condition' },
    { type: 'api', icon: '🔌', label: 'API Call' },
    { type: 'setVariable', icon: '📝', label: 'Variable' },
    { type: 'webhook', icon: '🪝', label: 'Webhook' },
    { type: 'transfer', icon: '📞', label: 'Transfer' },
    { type: 'end', icon: '🏁', label: 'End Call' },
];

export const WorkflowEditor = ({ user, onLogout }) => {
    const { agentId } = useParams();
    const navigate = useNavigate();
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [agentName, setAgentName] = useState('');
    const [loading, setLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState('');
    const [saving, setSaving] = useState(false);
    const reactFlowWrapper = useRef(null);

    useEffect(() => {
        loadWorkflow();
    }, [agentId]);

    const updateNodeData = useCallback((nodeId, field, value) => {
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === nodeId) {
                    return { ...node, data: { ...node.data, [field]: value } };
                }
                return node;
            })
        );
    }, [setNodes]);

    const loadWorkflow = async () => {
        try {
            const [agentRes, wfRes] = await Promise.all([
                fetch(`/api/agents/${agentId}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                }),
                fetch(`/api/agents/${agentId}/workflow`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                })
            ]);

            if (agentRes.ok) {
                const agentData = await agentRes.json();
                setAgentName(agentData.name);
            }

            if (wfRes.ok) {
                const wfData = await wfRes.json();
                if (wfData.workflow?.nodes?.length > 0) {
                    // Inject onChange callbacks
                    const nodesWithCallbacks = wfData.workflow.nodes.map(n => ({
                        ...n,
                        data: { ...n.data, onChange: (field, value) => updateNodeData(n.id, field, value) }
                    }));
                    setNodes(nodesWithCallbacks);
                    setEdges(wfData.workflow.edges || []);
                } else {
                    initializeWorkflow();
                }
            } else {
                initializeWorkflow();
            }
        } catch (error) {
            console.error('Failed to load workflow:', error);
            initializeWorkflow();
        } finally {
            setLoading(false);
        }
    };

    const initializeWorkflow = () => {
        const startId = 'start-1';
        setNodes([{
            id: startId,
            type: 'start',
            position: { x: 300, y: 50 },
            data: {
                greeting: 'Hello! How can I help you today?',
                onChange: (field, value) => updateNodeData(startId, field, value)
            }
        }]);
    };

    const onConnect = useCallback(
        (params) => setEdges((eds) => addEdge({ ...params, ...defaultEdgeOptions }, eds)),
        [setEdges]
    );

    const getDefaultNodeData = useCallback((type, nodeId) => {
        const onChange = (field, value) => updateNodeData(nodeId, field, value);
        switch (type) {
            case 'prompt': return { onChange, label: 'AI Assistant', systemPrompt: 'You are a helpful assistant.', model: 'gemini-2.0-flash', temperature: 0.7 };
            case 'condition': return { onChange, label: 'Check Condition', condition: 'intent === "booking"', description: 'Route based on condition' };
            case 'api': return { onChange, label: 'API Call', method: 'POST', url: '', headers: {}, body: {} };
            case 'end': return { onChange, message: 'Thank you for contacting us. Goodbye!' };
            case 'transfer': return { onChange, label: 'Transfer Call', phoneNumber: '', department: 'Sales' };
            case 'setVariable': return { onChange, label: 'Set Variable', variableName: 'userName', variableValue: '{{userInput}}' };
            case 'webhook': return { onChange, label: 'Send Webhook', url: '', method: 'POST', payload: {} };
            default: return { onChange };
        }
    }, [updateNodeData]);

    const addNode = useCallback((type) => {
        const newNodeId = `${type}-${Date.now()}`;
        setNodes((nds) => [...nds, {
            id: newNodeId,
            type,
            position: { x: Math.random() * 400 + 150, y: Math.random() * 300 + 150 },
            data: getDefaultNodeData(type, newNodeId)
        }]);
    }, [setNodes, getDefaultNodeData]);

    const onSave = async () => {
        setSaving(true);
        setSaveStatus('Saving...');
        try {
            // Strip onChange from data before saving
            const cleanNodes = nodes.map(n => ({
                ...n,
                data: Object.fromEntries(Object.entries(n.data).filter(([k]) => k !== 'onChange'))
            }));

            const response = await fetch(`/api/agents/${agentId}/workflow`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    workflowJson: { version: 1, nodes: cleanNodes, edges, variables: {} },
                    enabled: true
                })
            });

            if (response.ok) {
                setSaveStatus('✓ Saved');
                setTimeout(() => setSaveStatus(''), 2500);
            } else {
                setSaveStatus('✗ Failed');
            }
        } catch (error) {
            console.error('Save error:', error);
            setSaveStatus('✗ Error');
        } finally {
            setSaving(false);
        }
    };

    const onNodeDelete = useCallback((deletedNodes) => {
        const ids = deletedNodes.map(n => n.id);
        setEdges(eds => eds.filter(e => !ids.includes(e.source) && !ids.includes(e.target)));
    }, [setEdges]);

    if (loading) {
        return (
            <DashboardLayout user={user} onLogout={onLogout} title="Workflow Editor">
                <div className="loading-state">
                    <div className="loading-spinner"></div>
                    Loading workflow...
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout
            user={user}
            onLogout={onLogout}
            title={`Workflow: ${agentName}`}
            actions={
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    {saveStatus && <span className="wf-save-status">{saveStatus}</span>}
                    <button className="btn-save" onClick={onSave} disabled={saving}>
                        {saving ? 'Saving...' : '💾 Save Workflow'}
                    </button>
                    <button className="btn-secondary" onClick={() => navigate(`/agents/${agentId}`)}>
                        ← Back to Agent
                    </button>
                </div>
            }
        >
            <div className="workflow-editor-container">
                {/* Node Palette Toolbar */}
                <div className="workflow-toolbar">
                    <span className="toolbar-label">Add Nodes:</span>
                    {NODE_PALETTE.map(item => (
                        <button
                            key={item.type}
                            className="btn-add-node"
                            onClick={() => addNode(item.type)}
                        >
                            <span className="btn-node-icon">{item.icon}</span>
                            <span className="btn-node-label">{item.label}</span>
                        </button>
                    ))}
                </div>

                {/* React Flow Canvas */}
                <div className="workflow-canvas" ref={reactFlowWrapper}>
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onNodesDelete={onNodeDelete}
                        nodeTypes={nodeTypes}
                        defaultEdgeOptions={defaultEdgeOptions}
                        fitView
                        snapToGrid
                        snapGrid={[15, 15]}
                        deleteKeyCode={['Backspace', 'Delete']}
                        minZoom={0.3}
                        maxZoom={2}
                    >
                        <Controls className="wf-controls" />
                        <MiniMap
                            className="wf-minimap"
                            nodeColor={(node) => {
                                switch (node.type) {
                                    case 'start': return '#10b981';
                                    case 'prompt': return '#6366f1';
                                    case 'condition': return '#f59e0b';
                                    case 'api': return '#8b5cf6';
                                    case 'end': return '#ef4444';
                                    case 'transfer': return '#06b6d4';
                                    case 'setVariable': return '#f97316';
                                    case 'webhook': return '#ec4899';
                                    default: return '#64748b';
                                }
                            }}
                            maskColor="rgba(10, 10, 15, 0.7)"
                        />
                        <Background variant="dots" gap={20} size={1} color="rgba(99, 102, 241, 0.15)" />
                        <Panel position="top-left" className="wf-info-panel">
                            <div className="wf-info-stat">
                                <span className="wf-info-label">Nodes</span>
                                <span className="wf-info-value">{nodes.length}</span>
                            </div>
                            <div className="wf-info-stat">
                                <span className="wf-info-label">Edges</span>
                                <span className="wf-info-value">{edges.length}</span>
                            </div>
                        </Panel>
                    </ReactFlow>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default WorkflowEditor;
