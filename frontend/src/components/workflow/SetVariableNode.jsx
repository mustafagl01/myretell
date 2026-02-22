import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

export default memo(({ data, isConnectable }) => {
    return (
        <div className="custom-node variable-node">
            <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="node-handle target-handle" />
            <div className="node-header">
                <span className="node-icon">📝</span>
                <input
                    className="node-title-input"
                    value={data.label || 'Set Variable'}
                    onChange={(e) => data.onChange?.('label', e.target.value)}
                />
            </div>
            <div className="node-body">
                <div className="form-group">
                    <label>Variable Name</label>
                    <input
                        type="text"
                        className="node-input mono"
                        placeholder="userName"
                        value={data.variableName || ''}
                        onChange={(e) => data.onChange?.('variableName', e.target.value)}
                    />
                </div>
                <div className="form-group">
                    <label>Value</label>
                    <input
                        type="text"
                        className="node-input mono"
                        placeholder="{{userInput}}"
                        value={data.variableValue || ''}
                        onChange={(e) => data.onChange?.('variableValue', e.target.value)}
                    />
                </div>
            </div>
            <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="node-handle source-handle" />
        </div>
    );
});
