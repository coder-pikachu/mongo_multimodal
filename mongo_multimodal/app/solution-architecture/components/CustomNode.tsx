import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

const mongoColors = {
  primary: '#00684A',
  secondary: '#00ED64',
  dark: '#001E2B',
  light: '#E3FCF7',
  accent: '#B8E9D4',
};

const CustomNode: React.FC<NodeProps> = ({ data, isConnectable }) => {
  const getNodeStyle = () => {
    switch (data.type) {
      case 'database':
        return {
          background: mongoColors.primary,
          color: 'white',
          border: `2px solid ${mongoColors.secondary}`,
        };
      case 'cache':
        return {
          background: mongoColors.accent,
          color: mongoColors.dark,
          border: `2px solid ${mongoColors.primary}`,
        };
      case 'service':
        return {
          background: 'white',
          color: mongoColors.dark,
          border: `2px solid ${mongoColors.primary}`,
        };
      case 'client':
        return {
          background: mongoColors.secondary,
          color: mongoColors.dark,
          border: `2px solid ${mongoColors.primary}`,
        };
      default:
        return {
          background: mongoColors.light,
          color: mongoColors.dark,
          border: `1px solid ${mongoColors.accent}`,
        };
    }
  };

  const nodeStyle = getNodeStyle();

  return (
    <div
      className="px-4 py-3 rounded-lg shadow-lg transition-all duration-300 hover:shadow-xl cursor-pointer hover:scale-105"
      style={{
        ...nodeStyle,
        minWidth: '200px',
        maxWidth: '250px',
      }}
    >
      {data.incoming && (
        <Handle
          type="target"
          position={Position.Top}
          isConnectable={isConnectable}
          style={{ background: mongoColors.primary }}
        />
      )}
      
      <div className="flex items-center space-x-2">
        {data.icon && <div className="text-2xl">{data.icon}</div>}
        <div>
          <div className="font-bold text-sm">{data.label}</div>
          {data.sublabel && (
            <div className="text-xs opacity-80 mt-1">{data.sublabel}</div>
          )}
        </div>
      </div>
      
      {data.metrics && (
        <div className="mt-2 pt-2 border-t border-opacity-20" style={{ borderColor: mongoColors.dark }}>
          <div className="text-xs space-y-1">
            {data.metrics.map((metric: string, index: number) => (
              <div key={index} className="flex items-center space-x-1">
                <span className="text-green-500">•</span>
                <span>{metric}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {data.outgoing && (
        <Handle
          type="source"
          position={Position.Bottom}
          isConnectable={isConnectable}
          style={{ background: mongoColors.primary }}
        />
      )}
    </div>
  );
};

export default CustomNode;