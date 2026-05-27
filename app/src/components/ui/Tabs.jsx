import { Tabs as Base } from '@base-ui-components/react/tabs';

/**
 * Controlled segmented tab bar. The caller renders the active content itself
 * based on `value` (kept simple for the responsive editor/preview/code switch).
 * @param {{value, onValueChange, tabs:{value,label,icon?}[], class?, fitted?}} p
 */
export function TabBar({ value, onValueChange, tabs, class: cls = '', fitted = false }) {
  return (
    <Base.Root value={value} onValueChange={onValueChange} class={cls}>
      <Base.List class={`relative flex items-center gap-1 rounded-xl bg-gray-100 p-1 ${fitted ? 'w-full' : 'w-fit'}`}>
        {tabs.map((tab) => (
          <Base.Tab
            key={tab.value}
            value={tab.value}
            class={`relative z-10 inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium
              text-gray-500 transition-colors cursor-pointer select-none outline-none
              data-[selected]:text-gray-900 hover:text-gray-700 focus-visible:ring-2 focus-visible:ring-indigo-400/60
              ${fitted ? 'flex-1' : ''}`}
          >
            {tab.icon && <tab.icon />}
            {tab.label}
          </Base.Tab>
        ))}
        <Base.Indicator
          class="absolute top-1 bottom-1 z-0 rounded-lg bg-white shadow-sm transition-all duration-200 ease-out"
          style={{ left: 'var(--active-tab-left)', width: 'var(--active-tab-width)' }}
        />
      </Base.List>
    </Base.Root>
  );
}
