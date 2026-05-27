import { Tooltip as Base } from '@base-ui-components/react/tooltip';

/** App-level provider (shared hover delay). Mount once near the root. */
export function TooltipProvider({ children, delay = 350 }) {
  return <Base.Provider delay={delay}>{children}</Base.Provider>;
}

/** Wrap a single trigger element with a text tooltip. */
export function Tooltip({ label, side = 'bottom', children }) {
  if (!label) return children;
  return (
    <Base.Root>
      <Base.Trigger render={children} />
      <Base.Portal>
        <Base.Positioner side={side} sideOffset={6}>
          <Base.Popup class="bui-pop z-50 rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white shadow-lg">
            {label}
          </Base.Popup>
        </Base.Positioner>
      </Base.Portal>
    </Base.Root>
  );
}
