import { Dialog as Base } from '@base-ui-components/react/dialog';

/** Modal dialog. `trigger` is an element; `open`/`onOpenChange` optional (controlled). */
export function Dialog({ trigger, title, children, open, onOpenChange }) {
  return (
    <Base.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <Base.Trigger render={trigger} /> : null}
      <Base.Portal>
        <Base.Backdrop class="bui-pop fixed inset-0 z-50 bg-gray-900/30 backdrop-blur-[1px]" />
        <Base.Popup class="bui-pop fixed left-1/2 top-1/2 z-50 w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
          {title ? <Base.Title class="mb-2 text-lg font-bold text-gray-900">{title}</Base.Title> : null}
          {children}
        </Base.Popup>
      </Base.Portal>
    </Base.Root>
  );
}

export const DialogClose = Base.Close;
