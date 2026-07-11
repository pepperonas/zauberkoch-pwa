/** "Anpassen per Zuruf": quick chips or free text -> adapted recipe stream. */

import { useState } from 'react';

import { strings, t } from '../../i18n';
import { Button } from '../ui';
import { Sheet } from '../ui/Sheet';
import '../../pages/wizard.css';

interface Props {
  open: boolean;
  onClose: () => void;
  onAdapt: (anweisung: string) => void;
}

export function AdaptSheet({ open, onClose, onAdapt }: Props) {
  const [input, setInput] = useState('');

  const run = (anweisung: string) => {
    const clean = anweisung.trim();
    if (clean.length < 2) return;
    onClose();
    setInput('');
    onAdapt(clean);
  };

  return (
    <Sheet open={open} onClose={onClose} label={t('adapt.title')}>
      <div className="stack">
        <h3>{t('adapt.title')}</h3>
        <div className="chips">
          {strings.adapt.chips.map((chip) => (
            <button key={chip} className="chip" onClick={() => run(chip)}>
              ✨ {chip}
            </button>
          ))}
        </div>
        <input
          className="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && run(input)}
          placeholder={t('adapt.placeholder')}
          maxLength={200}
        />
        <Button onClick={() => run(input)} disabled={input.trim().length < 2}>
          {t('adapt.go')}
        </Button>
      </div>
    </Sheet>
  );
}
