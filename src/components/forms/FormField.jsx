export default function FormField({ field, value, onChange, darkMode = false }) {
  const handleChange = (e) => {
    const newValue = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    onChange(newValue);
  };

  // ... existing code with the handleChange function updated
} 