import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

export default memo(({ data, isConnectable }) => {
    return (
        <div className="custom-node end-node">
            <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="node-handle target-handle" />
            <div className="node-header">
                <span className="node-icon">🏁</span>
                <span className="node-title">End Call</span>
            </div>
            <div className="node-body">
                <div className="form-group">
                    <label>Goodbye Message</label>
                    <textarea
                        className="node-textarea"
                        placeholder="Goodbye message..."
                        value={data.message || ''}
                        onChange={(e) => data.onChange?.('message', e.target.value)}
                        rows={2}
                    />
                </div>
            </div>
        </div>
    );
});
