import { Dialog } from './ui/Dialog.jsx';
import { Tooltip } from './ui/Tooltip.jsx';
import { PresetPicker } from './PresetPicker.jsx';
import { FileIcon, InfoIcon, GithubIcon } from './ui/Icons.jsx';
import { t } from '../lib/i18n.js';

export function Header({ preset, onPreset, onLoadFile }) {
  return (
    <header class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 shadow-sm sm:px-6">
      <div class="min-w-0">
        <h1 class="truncate text-lg font-bold text-gray-900 sm:text-xl">{t('appTitle')}</h1>
        <p class="mt-0.5 hidden truncate text-xs text-gray-500 sm:block">{t('subtitle')}</p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <PresetPicker value={preset} onChange={onPreset} />

        <label class="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50">
          <FileIcon />
          <span class="hidden sm:inline">{t('loadFile')}</span>
          <input
            type="file"
            accept=".mmd,.txt"
            class="hidden"
            onChange={(e) => {
              const f = e.currentTarget.files?.[0];
              if (f) onLoadFile(f);
              e.currentTarget.value = '';
            }}
          />
        </label>

        <Tooltip label={t('github')}>
          <a
            href={t('repoUrl')}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('github')}
            class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
          >
            <GithubIcon />
          </a>
        </Tooltip>

        <Dialog
          trigger={
            <button
              type="button"
              aria-label={t('about')}
              class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100"
            >
              <InfoIcon />
            </button>
          }
          title={t('aboutTitle')}
        >
          <p class="text-sm leading-7 text-gray-600">{t('aboutBody')}</p>
          <p class="mt-3 text-xs text-gray-400">{t('aboutShortcuts')}</p>
        </Dialog>
      </div>
    </header>
  );
}
