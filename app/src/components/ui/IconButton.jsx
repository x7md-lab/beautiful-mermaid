import { Tooltip } from './Tooltip.jsx';
import { SpinnerIcon } from './Icons.jsx';

const VARIANTS = {
  ghost: 'text-gray-600 hover:bg-gray-100',
  primary: 'text-indigo-600 hover:bg-indigo-50',
  success: 'text-emerald-600 hover:bg-emerald-50',
  danger: 'text-red-600 hover:bg-red-50',
};

export function IconButton({ icon: Icon, label, loading = false, variant = 'ghost', disabled, class: cls = '', ...props }) {
  const button = (
    <button
      type="button"
      aria-label={label}
      disabled={disabled || loading}
      class={`inline-flex h-9 w-9 items-center justify-center rounded-lg transition
        disabled:opacity-45 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60
        ${VARIANTS[variant]} ${cls}`}
      {...props}
    >
      {loading ? <SpinnerIcon /> : <Icon />}
    </button>
  );
  return <Tooltip label={label}>{button}</Tooltip>;
}
