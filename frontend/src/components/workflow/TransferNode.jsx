import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

export default memo(({ data, isConnectable }) => {
    return (
        <div className="custom-node transfer-node">
            <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="node-handle target-handle" />
            <div className="node-header">
                <span className="node-icon">📞</span>
                <input
                    className="node-title-input"
                    value={data.label || 'Transfer Call'}
                    onChange={(e) => data.onChange?.('label', e.target.value)}
                />
            </div>
            <div className="node-body">
                <div className="form-group">
                    <label>Phone Number</label>
                    <input
                        type="tel"
                        className="node-input"
                        placeholder="+1 555-0123"
                        value={data.phoneNumber || ''}
                        onChange={(e) => data.onChange?.('phoneNumber', e.target.value)}
                    />
                </div>
                <div className="form-group">
                    <label>Department</label>
                    <select
                        className="node-select"
                        value={data.department || 'Sales'}
                        onChange={(e) => data.onChange?.('department', e.target.value)}
                    >
                        <option value="Sales">Sales</option>
                        <option value="Support">Support</option>
                        <option value="Billing">Billing</option>
                        <option value="General">General</option>
                    </select>
                </div>
            </div>
            <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="node-handle source-handle" />
        </div>
    );
});
