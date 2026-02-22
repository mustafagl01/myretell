import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';

export default memo(({ data, isConnectable }) => (
  <div className="custom-node condition-node">
    <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="node-handle" />
    <div className="node-header"><span>🔀</span><input className="node-title-input" value={data.label || 'Condition'} onChange={(e) => data.onChange?.('label', e.target.value)} /></div>
    <div className="form-group"><label>Condition</label><input type="text" value={data.condition || ''} onChange={(e) => data.onChange?.('condition', e.target.value)} /></div>
    <Handle type="source" position={Position.Bottom} id="true" isConnectable={isConnectable} className="node-handle handle-true" />
    <Handle type="source" position={Position.Bottom} id="false" isConnectable={isConnectable} className="node-handle handle-false" />
  </div>
));
