import { Select as Base } from '@base-ui-components/react/select';
import { ChevronIcon, CheckIcon } from './Icons.jsx';

/**
 * Grouped select built on Base UI.
 * @param {{value, onValueChange, groups:{label,items:{value,label}[]}[], ariaLabel?, placeholder?, class?}} p
 */
export function Select({ value, onValueChange, groups, ariaLabel, placeholder, class: cls = '' }) {
  const items = groups.flatMap((g) => g.items); // value → label for <Select.Value/>
  return (
    <Base.Root value={value} onValueChange={onValueChange} items={items}>
      <Base.Trigger
        aria-label={ariaLabel}
        class={`inline-flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2
          text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 outline-none
          focus-visible:ring-2 focus-visible:ring-indigo-400/60 ${cls}`}
      >
        <Base.Value>{(val) => items.find((i) => i.value === val)?.label ?? placeholder ?? ''}</Base.Value>
        <Base.Icon class="text-gray-400">
          <ChevronIcon width="1em" height="1em" />
        </Base.Icon>
      </Base.Trigger>
      <Base.Portal>
        <Base.Positioner side="bottom" align="start" sideOffset={6} alignItemWithTrigger={false} class="z-50">
          <Base.Popup class="bui-pop max-h-[60vh] min-w-[var(--anchor-width)] overflow-auto rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl">
            {groups.map((g) => (
              <Base.Group key={g.label}>
                <Base.GroupLabel class="px-2 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  {g.label}
                </Base.GroupLabel>
                {g.items.map((it) => (
                  <Base.Item
                    key={it.value}
                    value={it.value}
                    class="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-sm text-gray-700
                      outline-none select-none data-[highlighted]:bg-indigo-50 data-[highlighted]:text-indigo-700"
                  >
                    <Base.ItemText>{it.label}</Base.ItemText>
                    <Base.ItemIndicator class="text-indigo-600">
                      <CheckIcon width="1em" height="1em" />
                    </Base.ItemIndicator>
                  </Base.Item>
                ))}
              </Base.Group>
            ))}
          </Base.Popup>
        </Base.Positioner>
      </Base.Portal>
    </Base.Root>
  );
}
