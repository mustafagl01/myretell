import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

export default memo(({ data, isConnectable }) => {
    return (
        <div className="custom-node webhook-node">
            <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="node-handle target-handle" />
            <div className="node-header">
                <span className="node-icon">🪝</span>
                <input
                    className="node-title-input"
                    value={data.label || 'Send Webhook'}
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
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                    </select>
                </div>
                <div className="form-group">
                    <label>Webhook URL</label>
                    <input
                        type="url"
                        className="node-input"
                        placeholder="https://webhook.site/..."
                        value={data.url || ''}
                        onChange={(e) => data.onChange?.('url', e.target.value)}
                    />
                </div>
                <div className="form-group">
                    <label>Payload (JSON)</label>
                    <textarea
                        className="node-textarea mono"
                        placeholder='{"event": "booking_created"}'
                        value={typeof data.payload === 'string' ? data.payload : JSON.stringify(data.payload || {}, null, 2)}
                        onChange={(e) => {
                            try { data.onChange?.('payload', JSON.parse(e.target.value)); }
                            catch { data.onChange?.('payload', e.target.value); }
                        }}
                        rows={3}
                    />
                </div>
            </div>
            <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="node-handle source-handle" />
        </div>
    );
});
