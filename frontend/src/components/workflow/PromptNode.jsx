import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';

export default memo(({ data, isConnectable }) => (
  <div className="custom-node prompt-node">
    <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="node-handle" />
    <div className="node-header"><span>💬</span><input className="node-title-input" value={data.label || 'AI Assistant'} onChange={(e) => data.onChange?.('label', e.target.value)} /></div>
    <div className="form-group"><label>System Prompt</label><textarea value={data.systemPrompt || ''} onChange={(e) => data.onChange?.('systemPrompt', e.target.value)} rows={4} /></div>
    <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="node-handle" />
  </div>
));
