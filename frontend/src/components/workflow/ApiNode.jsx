import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

export default memo(({ data, isConnectable }) => {
    return (
        <div className="custom-node api-node">
            <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="node-handle target-handle" />
            <div className="node-header">
                <span className="node-icon">🔌</span>
                <input
                    className="node-title-input"
                    value={data.label || 'API Call'}
                    onChange={(e) => data.onChange?.('label', e.target.value)}
                />
            </div>
            <div className="node-body">
                <div className="form-group">
                    <label>Method</label>
                    <select
                        className="node-select"
                        value={data.method || 'POST'}
                        onChange={(e) => data.onChange?.('method', e.target.value)}
                    >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="DELETE">DELETE</option>
                    </select>
                </div>
                <div className="form-group">
                    <label>URL</label>
                    <input
                        type="url"
                        className="node-input"
                        placeholder="https://api.example.com/endpoint"
                        value={data.url || ''}
                        onChange={(e) => data.onChange?.('url', e.target.value)}
                    />
                </div>
                <div className="form-group">
                    <label>Headers (JSON)</label>
                    <textarea
                        className="node-textarea mono"
                        placeholder='{"Authorization": "Bearer {{token}}"}'
                        value={typeof data.headers === 'string' ? data.headers : JSON.stringify(data.headers || {}, null, 2)}
                        onChange={(e) => {
                            try { data.onChange?.('headers', JSON.parse(e.target.value)); }
                            catch { data.onChange?.('headers', e.target.value); }
                        }}
                        rows={3}
                    />
                </div>
                <div className="form-group">
                    <label>Body (JSON)</label>
                    <textarea
                        className="node-textarea mono"
                        placeholder='{"key": "{{value}}"}'
                        value={typeof data.body === 'string' ? data.body : JSON.stringify(data.body || {}, null, 2)}
                        onChange={(e) => {
                            try { data.onChange?.('body', JSON.parse(e.target.value)); }
                            catch { data.onChange?.('body', e.target.value); }
                        }}
                        rows={4}
                    />
                </div>
            </div>
            <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="node-handle source-handle" />
        </div>
    );
});
