/** Share dialog: creates the unlisted link, offers native share / copy / revoke. */

import { useEffect, useState } from 'react';

import { t } from '../../i18n';
import { api } from '../../lib/api';
import { Icon } from '../icons';
import { Button, Switch } from '../ui';
import { Dialog } from '../ui/Dialog';
import { useSnackbar } from '../ui/Snackbar';

interface Props {
  open: boolean;
  onClose: () => void;
  recipeId: number;
  titel: string;
  publicListed?: boolean;
}

export function ShareDialog({ open, onClose, recipeId, titel, publicListed = false }: Props) {
  const { show } = useSnackbar();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPublic, setIsPublic] = useState(publicListed);

  useEffect(() => {
    if (!open) return;
    setIsPublic(publicListed);
    setLoading(true);
    api
      .shareCreate(recipeId)
      .then((res) => setUrl(res.share_url))
      .catch(() => show(t('stream.failed')))
      .finally(() => setLoading(false));
  }, [open, recipeId, publicListed, show]);

  const togglePublic = async (next: boolean) => {
    setIsPublic(next);
    try {
      await api.sharePublic(recipeId, next);
    } catch {
      setIsPublic(!next);
    }
  };

  const shareStory = async () => {
    const token = url.split('/r/')[1];
    const storyUrl = `/api/v1/share/${token}/story.png`;
    try {
      const blob = await (await fetch(storyUrl)).blob();
      const file = new File([blob], `${titel}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: titel });
        return;
      }
    } catch {
      /* fall through to open-in-tab */
    }
    window.open(storyUrl, '_blank');
  };

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
          <Button onClick={() => void nativeShare()} disabled={!url}><Icon name="share" size={18} /> {t('recipe.shareNative')}</Button>
          <Button variant="outlined" onClick={() => void copyLink()} disabled={!url}><Icon name="copy" size={18} /> {t('recipe.shareCopyLink')}</Button>
          <Button variant="outlined" onClick={() => void shareStory()} disabled={!url}><Icon name="image" size={18} /> {t('recipe.shareStory')}</Button>
          <Button variant="danger" onClick={() => void revoke()} disabled={!url}><Icon name="ban" size={18} /> {t('recipe.shareRevoke')}</Button>
        </div>
        <div className="row row--between" style={{ minHeight: 'var(--touch-target)' }}>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'block' }}><Icon name="globe" size={16} /> {t('recipe.sharePublic')}</span>
            <span className="muted" style={{ font: 'var(--type-label-sm)' }}>{t('recipe.sharePublicHint')}</span>
          </span>
          <Switch checked={isPublic} onChange={(v) => void togglePublic(v)} label={t('recipe.sharePublic')} />
        </div>
      </div>
    </Dialog>
  );
}
