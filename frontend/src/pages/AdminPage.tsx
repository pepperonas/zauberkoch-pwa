/** Admin panel: usage/cost dashboard + allowlist management.
 * Route is guarded client-side; the API itself 404s for non-admins. */

import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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

  if (meLoading) return null;
  if (!me?.is_admin) return <Navigate to="/" replace />;

  const s = stats.data;

  return (
    <div>
      <h1 className="page__title">🛡️ {t('admin.title')}</h1>

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
                  <span>👍 {fb.up} · 👎 {fb.down}</span>
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
                {item.registered ? `✓ ${t('admin.registered')}` : t('admin.invited')}
              </span>
            </span>
            <IconButton label={t('common.delete')} onClick={() => remove.mutate(item.email)}>
              ✕
            </IconButton>
          </div>
        ))}
        {allowlist.isLoading && <p className="muted">{t('common.loading')}</p>}
        {add.isPending && <Button variant="text" disabled>{t('common.loading')}</Button>}
      </section>
    </div>
  );
}
