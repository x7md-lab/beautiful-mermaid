import { Select } from './ui/Select.jsx';
import { PRESET_GROUPS } from '../lib/presets.js';
import { t } from '../lib/i18n.js';

const GROUP_LABEL = { rtl: 'groupRtl', ltr: 'groupLtr', mix: 'groupMix' };

export function PresetPicker({ value, onChange }) {
  const groups = PRESET_GROUPS.filter((g) => g.items.length).map((g) => ({
    label: t(GROUP_LABEL[g.dir]),
    items: g.items.map((p) => ({ value: p.id, label: p.titleAr })),
  }));
  return (
    <Select
      value={value}
      onValueChange={onChange}
      groups={groups}
      ariaLabel={t('presets')}
      placeholder={t('choosePreset')}
      class="min-w-[15rem]"
    />
  );
}
