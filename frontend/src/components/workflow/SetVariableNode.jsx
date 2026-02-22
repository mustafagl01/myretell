import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';

export default memo(({ data, isConnectable }) => (
  <div className="custom-node">
    <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="node-handle" />
    <div className="node-header"><span>📝</span><span>Set Variable</span></div>
    <input type="text" value={data.variableName || ''} onChange={(e) => data.onChange?.('variableName', e.target.value)} placeholder="Variable" />
    <input type="text" value={data.variableValue || ''} onChange={(e) => data.onChange?.('variableValue', e.target.value)} placeholder="Value" />
    <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="node-handle" />
  </div>
));
