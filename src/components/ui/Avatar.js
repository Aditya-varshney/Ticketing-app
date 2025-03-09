import React from 'react';

export default function Avatar({ 
  src, 
  alt = 'User', 
  size = 'md',
  online = false,
  className = ''
}) {
  // Define sizes
  const sizes = {
    xs: 'h-6 w-6',
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  const sizeClass = sizes[size] || sizes.md;
  
  // Default avatar if no src provided
  const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(alt)}&background=random`;

  return (
    <div className={`relative ${className}`}>
      <div className={`${sizeClass} rounded-full overflow-hidden bg-gray-200`}>
        <img 
          src={src || defaultAvatar} 
          alt={alt}
          className="h-full w-full object-cover"
          onError={(e) => {
            e.target.src = defaultAvatar;
          }}
        />
      </div>
      {online && (
        <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full bg-green-400 ring-1 ring-white" />
      )}
    </div>
  );
}
