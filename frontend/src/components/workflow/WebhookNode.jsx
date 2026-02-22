import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';

export default memo(({ data, isConnectable }) => (
  <div className="custom-node">
    <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="node-handle" />
    <div className="node-header"><span>🪝</span><span>Webhook</span></div>
    <input type="url" value={data.url || ''} onChange={(e) => data.onChange?.('url', e.target.value)} placeholder="Webhook URL" />
    <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="node-handle" />
  </div>
));
