import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';

export default memo(({ data, isConnectable }) => (
  <div className="custom-node end-node">
    <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="node-handle" />
    <div className="node-header"><span>🏁</span><span>End Call</span></div>
    <textarea className="node-textarea" value={data.message || ''} onChange={(e) => data.onChange?.('message', e.target.value)} rows={2} />
  </div>
));
