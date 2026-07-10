/** Share dialog: creates the unlisted link, offers native share / copy / revoke. */

import { useEffect, useState } from 'react';

import { t } from '../../i18n';
import { api } from '../../lib/api';
import { Button } from '../ui';
import { Dialog } from '../ui/Dialog';
import { useSnackbar } from '../ui/Snackbar';

interface Props {
  open: boolean;
  onClose: () => void;
  recipeId: number;
  titel: string;
}

export function ShareDialog({ open, onClose, recipeId, titel }: Props) {
  const { show } = useSnackbar();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api
      .shareCreate(recipeId)
      .then((res) => setUrl(res.share_url))
      .catch(() => show(t('stream.failed')))
      .finally(() => setLoading(false));
  }, [open, recipeId, show]);

  const copyLink = async () => {
    await navigator.clipboard.writeText(url);
    show(t('recipe.copied'));
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: titel, url });
      } catch {
        /* cancelled */
      }
    } else {
      await copyLink();
    }
  };

  const revoke = async () => {
    await api.shareRevoke(recipeId);
    setUrl('');
    onClose();
    show(t('recipe.shareRevoked'), {
      actionLabel: t('undo'),
      onAction: async () => {
        await api.shareCreate(recipeId);
      },
    });
  };

  return (
    <Dialog open={open} onClose={onClose} label={t('recipe.shareTitle')}>
      <div className="stack">
        <h3>{t('recipe.shareTitle')}</h3>
        <p className="muted">{t('recipe.shareText')}</p>
        <input className="input" readOnly value={loading ? t('common.loading') : url} aria-label="Share-Link" onFocus={(e) => e.target.select()} />
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <Button onClick={() => void nativeShare()} disabled={!url}>📤 {t('recipe.shareNative')}</Button>
          <Button variant="outlined" onClick={() => void copyLink()} disabled={!url}>📋 {t('recipe.shareCopyLink')}</Button>
          <Button variant="danger" onClick={() => void revoke()} disabled={!url}>🚫 {t('recipe.shareRevoke')}</Button>
        </div>
      </div>
    </Dialog>
  );
}
