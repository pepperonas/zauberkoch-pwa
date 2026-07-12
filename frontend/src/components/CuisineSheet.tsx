/** Cuisine editor: personalize the wizard's cuisine chips.
 * Current selection on top (tap = remove), searchable ~110-entry catalog
 * grouped by region below (tap = add), custom entries via search, reset to
 * app defaults. Persisted in the user preferences (kuechen). */

import { useEffect, useMemo, useState } from 'react';

import { strings, t } from '../i18n';
import { api } from '../lib/api';
import { useApp } from '../state/app';
import { Icon } from './icons';
import { Button, Chip } from './ui';
import { Sheet } from './ui/Sheet';
import { useSnackbar } from './ui/Snackbar';

const MAX = 40;

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called with the saved list so the wizard can drop a removed selection. */
  onSaved?: (kuechen: string[]) => void;
}

export function CuisineSheet({ open, onClose, onSaved }: Props) {
  const { me, refreshMe } = useApp();
  const { show } = useSnackbar();
  const [selection, setSelection] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const custom = me?.preferences?.kuechen ?? [];
      setSelection(custom.length > 0 ? custom : [...strings.cuisines]);
      setQuery('');
    }
  }, [open, me]);

  const selectedLower = useMemo(() => new Set(selection.map((s) => s.toLowerCase())), [selection]);

  const add = (name: string) => {
    if (selectedLower.has(name.toLowerCase())) return;
    if (selection.length >= MAX) {
      show(t('wizard.cuisineMax'));
      return;
    }
    setSelection([...selection, name]);
  };
  const remove = (name: string) => setSelection(selection.filter((s) => s !== name));
  const toggle = (name: string) => (selectedLower.has(name.toLowerCase()) ? remove(name) : add(name));

  const q = query.trim().toLowerCase();
  const filteredRegions = useMemo(
    () =>
      strings.cuisineRegions
        .map((r) => ({ ...r, items: q ? r.items.filter((i) => i.toLowerCase().includes(q)) : [...r.items] }))
        .filter((r) => r.items.length > 0),
    [q],
  );
  const exactMatch = strings.cuisineRegions.some((r) => r.items.some((i) => i.toLowerCase() === q));
  const showCustomAdd = q.length >= 2 && !exactMatch && !selectedLower.has(q);

  const save = async () => {
    setSaving(true);
    try {
      await api.putPreferences({ ...me!.preferences, kuechen: selection });
      refreshMe();
      onSaved?.(selection);
      onClose();
      show(t('wizard.cuisineSaved'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} label={t('wizard.cuisineSheetTitle')}>
      <div className="stack">
        <h3>{t('wizard.cuisineSheetTitle')}</h3>
        <p className="muted" style={{ font: 'var(--type-body)' }}>{t('wizard.cuisineSheetHint')}</p>

        <div>
          <span className="wiz__row-label">
            {t('wizard.cuisineYourSelection')} ({selection.length})
          </span>
          <div className="chips" style={{ marginTop: 'var(--space-2)' }}>
            {selection.map((name) => (
              <Chip key={name} selected onToggle={() => remove(name)}>
                {name} <Icon name="close" size={13} />
              </Chip>
            ))}
          </div>
        </div>

        <input
          className="input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('wizard.cuisineSearch')}
          maxLength={40}
          aria-label={t('wizard.cuisineSearch')}
        />
        {showCustomAdd && (
          <div className="chips">
            <Chip selected={false} onToggle={() => { add(query.trim()); setQuery(''); }}>
              {strings.wizard.cuisineAddCustom(query.trim())}
            </Chip>
          </div>
        )}

        {filteredRegions.map((region) => (
          <div key={region.name}>
            <span className="wiz__row-label">
              <Icon name={region.icon} size={15} /> {region.name}
            </span>
            <div className="chips" style={{ marginTop: 'var(--space-2)' }}>
              {region.items.map((name) => (
                <Chip key={name} selected={selectedLower.has(name.toLowerCase())} onToggle={() => toggle(name)}>
                  {name}
                </Chip>
              ))}
            </div>
          </div>
        ))}

        <div className="row row--between">
          <Button variant="text" onClick={() => setSelection([...strings.cuisines])}>
            {t('wizard.cuisineReset')}
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            {t('common.save')}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
