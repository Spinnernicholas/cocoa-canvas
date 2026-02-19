'use client';

import { useTheme } from './ThemeProvider';
import { useState } from 'react';

interface MarshmallowProps {
  className?: string;
  size?: number;
  animationDuration?: string;
  animationDelay?: string;
}

export default function Marshmallow({ className = '', size = 40, animationDuration = '3s', animationDelay = '0s' }: MarshmallowProps) {
  const { theme } = useTheme();
  const [rotation] = useState(() => Math.random() * 90 - 45);
  
  // Dark marshmallows for light theme, light marshmallows for dark theme
  const bodyFill = theme === 'light' ? '#6B5744' : '#E8D5C4';
  const mainFill = theme === 'light' ? '#8B7355' : '#FFFAF5';
  const highlightFill = theme === 'light' ? '#A89584' : '#FFFFFF';
  
  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      {/* Wave ripple - only in dark mode, stationary outside bouncing container */}
      {/* {theme === 'dark' && (
        <div className="cocoa-wave" style={{ animationDuration, animationDelay }} />
      )} */}
      
      {/* Bouncing marshmallow container */}
      <div 
        className="animate-marshmallow-bob"
        style={{ animationDuration, animationDelay }}
      >
        <svg 
          width={size} 
          height={size} 
          viewBox="0 0 470 470" 
          xmlns="http://www.w3.org/2000/svg"
          className={`relative z-10 ${className}`}
          style={{ transform: `rotate(${rotation}deg)` }}
        >
      <g>
        {/* Main marshmallow body with stroke */}
        <path d="M349.54,30.23C318.833,10.736,278.155,0,235,0s-83.832,10.736-114.54,30.23c-31.765,20.166-49.259,47.332-49.259,76.493
          v256.553c0,29.162,17.494,56.328,49.26,76.494C151.168,459.264,191.846,470,235,470s83.832-10.736,114.539-30.23
          c31.765-20.166,49.259-47.332,49.259-76.494V106.723C398.798,77.562,381.304,50.396,349.54,30.23z M341.5,427.106
          C313.167,445.094,275.344,455,235"
          fill={bodyFill}/>
        
        {/* Highlight spots */}
        <circle cx="339.971" cy="354.923" r="8" fill={highlightFill}/>
        <circle cx="315.593" cy="393.422" r="8" fill={highlightFill}/>
        <circle cx="137.041" cy="251.677" r="8" fill={highlightFill}/>
        
        {/* Main outlined marshmallow shape */}
        <path d="M349.54,30.23C318.833,10.736,278.155,0,235,0s-83.832,10.736-114.54,30.23c-31.765,20.166-49.259,47.332-49.259,76.493
          v256.553c0,29.162,17.494,56.328,49.26,76.494C151.168,459.264,191.846,470,235,470s83.832-10.736,114.539-30.23
          c31.765-20.166,49.259-47.332,49.259-76.494V106.723C398.798,77.562,381.304,50.396,349.54,30.23z M341.5,427.106
          C313.167,445.094,275.344,455,235,455s-78.166-9.906-106.5-27.894c-27.277-17.316-42.299-39.985-42.299-63.83V151.701
          c8.246,11.645,19.76,22.311,34.259,31.515c30.708,19.494,71.386,30.23,114.54,30.23c28.309,0,56.193-4.738,80.641-13.702
          c3.889-1.426,5.886-5.734,4.46-9.624c-0.018-0.048-0.041-0.092-0.059-0.14c-1.479-3.794-5.722-5.728-9.565-4.32
          c-22.811,8.364-48.91,12.785-75.477,12.785c-40.344,0-78.166-9.906-106.5-27.894c-27.277-17.316-42.299-39.985-42.299-63.83
          s15.021-46.513,42.299-63.83C156.834,24.906,194.657,15,235,15c40.343,0,78.166,9.906,106.5,27.894
          c27.276,17.316,42.298,39.984,42.298,63.83c0,25.093-17.235,49.459-47.288,66.852c-3.532,2.044-4.766,6.526-2.817,10.086
          c0.029,0.053,0.052,0.109,0.083,0.162c2.075,3.585,6.665,4.809,10.248,2.734c17.003-9.841,30.452-21.82,39.774-35.063v211.782
          C383.798,387.122,368.777,409.79,341.5,427.106z" 
          fill={mainFill}/>
      </g>
    </svg>
      </div>
    </div>
  );
}
