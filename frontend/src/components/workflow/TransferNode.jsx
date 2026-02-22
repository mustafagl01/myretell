import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';

export default memo(({ data, isConnectable }) => (
  <div className="custom-node">
    <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="node-handle" />
    <div className="node-header"><span>📞</span><span>Transfer</span></div>
    <input type="text" value={data.phoneNumber || ''} onChange={(e) => data.onChange?.('phoneNumber', e.target.value)} placeholder="Phone number" />
    <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="node-handle" />
  </div>
));
