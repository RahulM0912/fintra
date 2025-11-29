import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
  rounded?: string;
}

export function Skeleton({ width = '100%', height = '100%', rounded = 'md', className = '', ...props }: SkeletonProps) {
  const roundedClass = `rounded-${rounded}`;
  return (
    <div
      className={`bg-gray-800/30 animate-pulse ${roundedClass} ${className}`}
      style={{ width, height }}
      {...props}
    />
  );
}
