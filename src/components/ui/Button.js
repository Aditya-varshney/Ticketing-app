import React from 'react';

const Button = ({ 
  children, 
  type = 'button', 
  onClick, 
  disabled = false, 
  variant = 'primary',
  size = 'md',
  className = '',
  ...props 
}) => {
  // Base button styles
  const baseStyles = "font-medium rounded-lg focus:outline-none transition-colors duration-200 flex items-center justify-center";
  
  // Size variations
  const sizeStyles = {
    xs: "px-2.5 py-1 text-xs",
    sm: "px-3 py-1.5 text-sm",
    md: "px-5 py-2.5 text-base", // Made larger (was py-2)
    lg: "px-6 py-3 text-lg",    // Added larger option
    xl: "px-8 py-4 text-xl"     // Added extra large option
  };
  
  // Variant styles with more vibrant colors
  const variantStyles = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md",
    secondary: "bg-gray-600 hover:bg-gray-700 text-white shadow-sm hover:shadow-md",
    outline: "border border-gray-300 dark:border-gray-600 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 shadow-sm",
    success: "bg-green-600 hover:bg-green-700 text-white shadow-sm hover:shadow-md",
    danger: "bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md",
    warning: "bg-yellow-500 hover:bg-yellow-600 text-white shadow-sm hover:shadow-md",
    info: "bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm hover:shadow-md",
    light: "bg-gray-200 hover:bg-gray-300 text-gray-800 shadow-sm",
    dark: "bg-gray-800 hover:bg-gray-900 text-white shadow-sm hover:shadow-md",
  };
  
  // Disabled state
  const disabledStyles = disabled 
    ? "opacity-60 cursor-not-allowed" 
    : "hover:scale-105 active:scale-100";
  
  // Combine styles
  const buttonStyles = `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${disabledStyles} ${className}`;
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={buttonStyles}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
