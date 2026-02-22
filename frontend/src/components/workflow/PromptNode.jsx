import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

const MODEL_OPTIONS = [
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet' },
    { value: 'claude-sonnet-4.5', label: 'Claude Sonnet 4.5' },
    { value: 'llama-3.3-70b', label: 'Llama 3.3 70B (Groq)' },
    { value: 'deepgram-default', label: 'Deepgram Default (Free)' },
];

export default memo(({ data, isConnectable }) => {
    return (
        <div className="custom-node prompt-node">
            <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="node-handle target-handle" />
            <div className="node-header">
                <span className="node-icon">💬</span>
                <input
                    className="node-title-input"
                    value={data.label || 'AI Assistant'}
                    onChange={(e) => data.onChange?.('label', e.target.value)}
                    placeholder="Node label..."
                />
            </div>
            <div className="node-body">
                <div className="form-group">
                    <label>System Prompt</label>
                    <textarea
                        className="node-textarea"
                        placeholder="You are a helpful assistant..."
                        value={data.systemPrompt || ''}
                        onChange={(e) => data.onChange?.('systemPrompt', e.target.value)}
                        rows={4}
                    />
                </div>
                <div className="form-group">
                    <label>Model</label>
                    <select
                        className="node-select"
                        value={data.model || 'gemini-2.0-flash'}
                        onChange={(e) => data.onChange?.('model', e.target.value)}
                    >
                        {MODEL_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <label>Temperature: {data.temperature ?? 0.7}</label>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={data.temperature ?? 0.7}
                        onChange={(e) => data.onChange?.('temperature', parseFloat(e.target.value))}
                    />
                </div>
            </div>
            <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="node-handle source-handle" />
        </div>
    );
});
