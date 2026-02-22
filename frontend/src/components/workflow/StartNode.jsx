import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

export default memo(({ data, isConnectable }) => {
    return (
        <div className="custom-node start-node">
            <div className="node-header">
                <span className="node-icon">🚀</span>
                <span className="node-title">Start</span>
            </div>
            <div className="node-body">
                <div className="form-group">
                    <label>Greeting</label>
                    <textarea
                        className="node-textarea"
                        placeholder="Initial greeting..."
                        value={data.greeting || ''}
                        onChange={(e) => data.onChange?.('greeting', e.target.value)}
                        rows={3}
                    />
                </div>
            </div>
            <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="node-handle source-handle" />
        </div>
    );
});
