import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

const Logo = ({ className = '', size = 'md', withText = true }) => {
  const sizes = {
    sm: 30,
    md: 40,
    lg: 50,
    xl: 60
  };

  return (
    <Link href="/" className={`flex items-center ${className}`}>
      <div className="flex items-center">
        <Image 
          src="/images/logo.png" 
          alt="iTicket Logo" 
          width={sizes[size]} 
          height={sizes[size]}
          className="object-contain"
        />
        {withText && (
          <span className={`font-bold ml-2 ${
            size === 'sm' ? 'text-lg' :
            size === 'md' ? 'text-xl' :
            size === 'lg' ? 'text-2xl' :
            'text-3xl'
          }`}>
            iTicket
          </span>
        )}
      </div>
    </Link>
  );
};

export default Logo; 