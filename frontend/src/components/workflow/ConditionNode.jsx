import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

export default memo(({ data, isConnectable }) => {
    return (
        <div className="custom-node condition-node">
            <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="node-handle target-handle" />
            <div className="node-header">
                <span className="node-icon">🔀</span>
                <input
                    className="node-title-input"
                    value={data.label || 'Condition'}
                    onChange={(e) => data.onChange?.('label', e.target.value)}
                />
            </div>
            <div className="node-body">
                <div className="form-group">
                    <label>Condition</label>
                    <input
                        type="text"
                        className="node-input"
                        placeholder='e.g. intent === "booking"'
                        value={data.condition || ''}
                        onChange={(e) => data.onChange?.('condition', e.target.value)}
                    />
                </div>
                <div className="form-group">
                    <label>Description</label>
                    <textarea
                        className="node-textarea"
                        placeholder="Explain what this checks..."
                        value={data.description || ''}
                        onChange={(e) => data.onChange?.('description', e.target.value)}
                        rows={2}
                    />
                </div>
            </div>
            <div className="condition-handles">
                <div className="handle-group handle-left">
                    <Handle type="source" position={Position.Bottom} id="true" isConnectable={isConnectable} className="node-handle handle-true" style={{ left: '25%' }} />
                    <span className="handle-label true-label">✓ True</span>
                </div>
                <div className="handle-group handle-right">
                    <Handle type="source" position={Position.Bottom} id="false" isConnectable={isConnectable} className="node-handle handle-false" style={{ left: '75%' }} />
                    <span className="handle-label false-label">✗ False</span>
                </div>
            </div>
        </div>
    );
});
