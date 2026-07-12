/** Admin panel: usage/cost dashboard + allowlist management.
 * Route is guarded client-side; the API itself 404s for non-admins. */

import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Icon } from '../components/icons';
import { Button, Chip, IconButton } from '../components/ui';
import { useSnackbar } from '../components/ui/Snackbar';
import { strings, t } from '../i18n';
import { api } from '../lib/api';
import { useApp } from '../state/app';

const FORMAT = new Intl.NumberFormat('de-DE');

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="nutri__cell" style={{ textAlign: 'left', padding: 'var(--space-4)' }}>
      <div className="nutri__label">{label}</div>
      <div className="nutri__value" style={{ margin: 'var(--space-1) 0' }}>{value}</div>
      {sub && <div className="nutri__label">{sub}</div>}
    </div>
  );
}

export function AdminPage() {
  const { me, meLoading } = useApp();
  const { show } = useSnackbar();
  const queryClient = useQueryClient();
  const [days, setDays] = useState(30);
  const [email, setEmail] = useState('');
  const [inviteCount, setInviteCount] = useState(3);
  const [freshCodes, setFreshCodes] = useState<string[]>([]);

  const stats = useQuery({
    queryKey: ['admin', 'stats', days],
    queryFn: () => api.adminStats(days),
    enabled: Boolean(me?.is_admin),
  });
  const allowlist = useQuery({
    queryKey: ['admin', 'allowlist'],
    queryFn: () => api.adminAllowlist(),
    enabled: Boolean(me?.is_admin),
  });

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['admin', 'allowlist'] });
  const add = useMutation({
    mutationFn: (value: string) => api.adminAllowlistAdd(value),
    onSuccess: () => {
      invalidate();
      show(t('admin.allowlistAdded'));
    },
  });
  const remove = useMutation({
    mutationFn: (value: string) => api.adminAllowlistRemove(value),
    onSuccess: (_, value) => {
      invalidate();
      show(t('admin.allowlistRemoved'), {
        actionLabel: t('undo'),
        onAction: async () => {
          await api.adminAllowlistAdd(value);
          invalidate();
        },
      });
    },
  });

  const invites = useQuery({
    queryKey: ['admin', 'invites'],
    queryFn: () => api.adminInvites(),
    enabled: Boolean(me?.is_admin),
  });
  const invalidateInvites = () => void queryClient.invalidateQueries({ queryKey: ['admin', 'invites'] });
  const createInvites = useMutation({
    mutationFn: (count: number) => api.adminInvitesCreate(count),
    onSuccess: (res) => {
      setFreshCodes(res.created);
      invalidateInvites();
      show(strings.admin.inviteCreated(res.created.length));
    },
  });
  const revokeInvite = useMutation({
    mutationFn: (code: string) => api.adminInviteRevoke(code),
    onSuccess: (_, code) => {
      setFreshCodes((c) => c.filter((x) => x !== code));
      invalidateInvites();
      show(t('admin.inviteRevoked'));
    },
  });
  const copyCode = async (text: string) => {
    await navigator.clipboard.writeText(text);
    show(t('admin.inviteCopied'));
  };

  if (meLoading) return null;
  if (!me?.is_admin) return <Navigate to="/" replace />;

  const s = stats.data;

  return (
    <div>
      <h1 className="page__title"><Icon name="shield" size={22} /> {t('admin.title')}</h1>

      <div className="chips" style={{ marginBottom: 'var(--space-5)' }}>
        {[7, 30, 90].map((d) => (
          <Chip key={d} selected={days === d} onToggle={() => setDays(d)}>
            {strings.admin.range(d)}
          </Chip>
        ))}
      </div>

      {s && (
        <div className="stack">
          <div className="nutri">
            <Tile
              label={t('admin.generations')}
              value={FORMAT.format(s.generations.total)}
              sub={strings.admin.liveCached(s.generations.live, s.generations.cached, s.generations.errors)}
            />
            <Tile label={t('admin.cost')} value={`$${s.cost_usd.toFixed(2)}`} sub={strings.admin.limits(s.limits.per_user, s.limits.global)} />
            <Tile label={t('admin.cacheRate')} value={`${s.cache_hit_rate}%`} sub={`Cache-Read ${FORMAT.format(s.tokens.cache_read)} Tok`} />
            <Tile label={t('admin.median')} value={`${(s.median_duration_ms / 1000).toFixed(1)}s`} sub={`${t('admin.tokens')}: ${FORMAT.format(s.tokens.in)} / ${FORMAT.format(s.tokens.out)}`} />
          </div>

          {s.per_user.length > 0 && (
            <section className="card card--outlined">
              <h3>{t('admin.perUser')}</h3>
              {s.per_user.map((u) => (
                <div key={u.email} className="row row--between" style={{ minHeight: 36 }}>
                  <span className="muted">{u.email}</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{u.count}</span>
                </div>
              ))}
            </section>
          )}

          {Object.keys(s.feedback).length > 0 && (
            <section className="card card--outlined">
              <h3>{t('admin.feedbackTitle')}</h3>
              {Object.entries(s.feedback).map(([version, fb]) => (
                <div key={version} className="row row--between" style={{ minHeight: 36 }}>
                  <span className="muted">{version}</span>
                  <span><Icon name="thumbUp" size={14} /> {fb.up} · <Icon name="thumbDown" size={14} /> {fb.down}</span>
                </div>
              ))}
            </section>
          )}
        </div>
      )}

      <section className="section">
        <h2>{t('admin.allowlist')}</h2>
        <input
          className="input"
          style={{ margin: 'var(--space-3) 0' }}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && email.includes('@')) {
              add.mutate(email.trim().toLowerCase());
              setEmail('');
            }
          }}
          placeholder={t('admin.allowlistAdd')}
        />
        {(allowlist.data?.items ?? []).map((item) => (
          <div key={item.email} className="row row--between" style={{ minHeight: 'var(--touch-target)' }}>
            <span>
              {item.email}{' '}
              <span className="muted" style={{ font: 'var(--type-label-sm)' }}>
                {item.registered ? <><Icon name="check" size={12} /> {t('admin.registered')}</> : t('admin.invited')}
              </span>
            </span>
            <IconButton label={t('common.delete')} onClick={() => remove.mutate(item.email)}>
              <Icon name="close" size={18} />
            </IconButton>
          </div>
        ))}
        {allowlist.isLoading && <p className="muted">{t('common.loading')}</p>}
        {add.isPending && <Button variant="text" disabled>{t('common.loading')}</Button>}
      </section>

      <section className="section">
        <h2><Icon name="ticket" size={20} /> {t('admin.invites')}</h2>
        <p className="muted" style={{ font: 'var(--type-body)', margin: 'var(--space-2) 0 var(--space-4)' }}>
          {t('admin.invitesHint')}
        </p>

        <div className="row" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="stepper">
            <button className="stepper__btn" onClick={() => setInviteCount((n) => Math.max(1, n - 1))} aria-label="−">−</button>
            <span className="stepper__value" style={{ height: 'auto' }}>{inviteCount}</span>
            <button className="stepper__btn" onClick={() => setInviteCount((n) => Math.min(50, n + 1))} aria-label="+">+</button>
          </div>
          <Button onClick={() => createInvites.mutate(inviteCount)} disabled={createInvites.isPending}>
            <Icon name="plus" size={18} /> {strings.admin.inviteGenerate(inviteCount)}
          </Button>
        </div>

        {freshCodes.length > 0 && (
          <div className="card card--outlined" style={{ marginTop: 'var(--space-4)', background: 'var(--c-primary-container)', color: 'var(--c-on-primary-container)' }}>
            <div className="row row--between">
              <strong>{t('admin.inviteNew')}</strong>
              <Button variant="text" onClick={() => void copyCode(freshCodes.join('\n'))}>
                <Icon name="copy" size={16} /> {t('admin.inviteCopyAll')}
              </Button>
            </div>
            <div style={{ marginTop: 'var(--space-2)' }}>
              {freshCodes.map((code) => (
                <button
                  key={code}
                  className="row row--between"
                  style={{ width: '100%', minHeight: 40, textAlign: 'left', color: 'inherit' }}
                  onClick={() => void copyCode(code)}
                >
                  <code style={{ font: 'var(--type-title)' }}>{code}</code>
                  <Icon name="copy" size={16} />
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: 'var(--space-4)' }}>
          {invites.isLoading && <p className="muted">{t('common.loading')}</p>}
          {invites.data && invites.data.items.length === 0 && <p className="muted">{t('admin.inviteNone')}</p>}
          {(invites.data?.items ?? []).map((inv) => (
            <div key={inv.code} className="row row--between" style={{ minHeight: 'var(--touch-target)' }}>
              <span style={{ minWidth: 0 }}>
                <code style={{ opacity: inv.used ? 0.5 : 1, textDecoration: inv.used ? 'line-through' : 'none' }}>
                  {inv.code}
                </code>{' '}
                <span className="muted" style={{ font: 'var(--type-label-sm)' }}>
                  {inv.used
                    ? inv.used_by
                      ? strings.admin.inviteUsedBy(inv.used_by)
                      : <><Icon name="check" size={12} /> {t('admin.registered')}</>
                    : t('admin.inviteUnused')}
                </span>
              </span>
              <span className="row" style={{ gap: 'var(--space-1)' }}>
                {!inv.used && (
                  <IconButton label={t('admin.inviteCopied')} onClick={() => void copyCode(inv.code)}>
                    <Icon name="copy" size={18} />
                  </IconButton>
                )}
                {!inv.used && (
                  <IconButton label={t('common.delete')} onClick={() => revokeInvite.mutate(inv.code)}>
                    <Icon name="close" size={18} />
                  </IconButton>
                )}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
