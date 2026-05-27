import { SpinnerIcon } from './Icons.jsx';

const VARIANTS = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm',
  secondary: 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 shadow-sm',
  ghost: 'text-gray-600 hover:bg-gray-100',
  danger: 'text-red-600 hover:bg-red-50',
};
const SIZES = {
  sm: 'text-xs px-3 py-1.5 gap-1.5',
  md: 'text-sm px-4 py-2 gap-2',
};

export function Button({ variant = 'secondary', size = 'md', loading = false, icon: Icon, children, class: cls = '', disabled, ...props }) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      class={`inline-flex items-center justify-center rounded-lg font-medium transition select-none
        disabled:opacity-55 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60
        ${VARIANTS[variant]} ${SIZES[size]} ${cls}`}
      {...props}
    >
      {loading ? <SpinnerIcon /> : Icon ? <Icon /> : null}
      {children}
    </button>
  );
}
