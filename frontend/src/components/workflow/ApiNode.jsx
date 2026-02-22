import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';

export default memo(({ data, isConnectable }) => (
  <div className="custom-node api-node">
    <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="node-handle" />
    <div className="node-header"><span>🔌</span><input className="node-title-input" value={data.label || 'API Call'} onChange={(e) => data.onChange?.('label', e.target.value)} /></div>
    <div className="form-group"><label>URL</label><input type="url" value={data.url || ''} onChange={(e) => data.onChange?.('url', e.target.value)} /></div>
    <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="node-handle" />
  </div>
));
