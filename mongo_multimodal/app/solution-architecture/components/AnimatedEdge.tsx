import React from 'react';
import { EdgeProps, getSmoothStepPath, EdgeLabelRenderer, BaseEdge } from 'reactflow';

const mongoColors = {
  primary: '#00684A',
  secondary: '#00ED64',
  dark: '#001E2B',
  light: '#E3FCF7',
  accent: '#B8E9D4',
};

const AnimatedEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
  style,
}) => {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 10,
  });

  const getEdgeColor = () => {
    switch (data?.flow) {
      case 'query':
        return mongoColors.secondary;
      case 'cache':
        return mongoColors.accent;
      case 'background':
        return mongoColors.primary;
      default:
        return mongoColors.primary;
    }
  };

  const edgeColor = getEdgeColor();

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: edgeColor,
          strokeWidth: 2,
        }}
      />
      {data?.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              fontSize: 12,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <div
              className="px-2 py-1 rounded text-xs font-medium"
              style={{
                background: 'white',
                color: mongoColors.dark,
                border: `1px solid ${edgeColor}`,
              }}
            >
              {data.label}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default AnimatedEdge;