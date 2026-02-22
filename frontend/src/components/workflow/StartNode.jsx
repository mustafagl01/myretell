import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';

export default memo(({ data, isConnectable }) => (
  <div className="custom-node start-node">
    <div className="node-header"><span>🚀</span><span>Start</span></div>
    <textarea className="node-textarea" value={data.greeting || ''} onChange={(e) => data.onChange?.('greeting', e.target.value)} rows={3} />
    <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="node-handle" />
  </div>
));
