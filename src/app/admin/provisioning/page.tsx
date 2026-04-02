'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  adminCreateNetworkGroup,
  adminCreateUser,
  adminRegisterSensor,
  getAdminUserNetworkGroups,
  getAdminUsers,
} from '@/lib/api';
import type { AdminUserRow, NetworkGroupInfo } from '@/lib/api';
import { UserPlus, Network, Cpu, RefreshCw } from 'lucide-react';

export default function AdminProvisioningPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createMsg, setCreateMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [createBusy, setCreateBusy] = useState(false);

  const [netEmail, setNetEmail] = useState('');
  const [netName, setNetName] = useState('');
  const [netMsg, setNetMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [netBusy, setNetBusy] = useState(false);

  const [sensorOwner, setSensorOwner] = useState('');
  const [sensorId, setSensorId] = useState('');
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [depth, setDepth] = useState('3');
  const [networkGroupId, setNetworkGroupId] = useState<string>('');
  const [ownerNetworks, setOwnerNetworks] = useState<NetworkGroupInfo[]>([]);
  const [sensorMsg, setSensorMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [sensorBusy, setSensorBusy] = useState(false);

  async function loadUsers() {
    setLoadingUsers(true);
    try {
      const list = await getAdminUsers();
      setUsers(list);
    } catch {
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const email = sensorOwner.trim();
    if (!email) {
      setOwnerNetworks([]);
      setNetworkGroupId('');
      return;
    }
    (async () => {
      try {
        const nets = await getAdminUserNetworkGroups(email);
        if (!cancelled) {
          setOwnerNetworks(nets);
          setNetworkGroupId((prev) => {
            if (prev && nets.some((n) => n.id === prev)) return prev;
            return nets[0]?.id ?? '';
          });
        }
      } catch {
        if (!cancelled) {
          setOwnerNetworks([]);
          setNetworkGroupId('');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sensorOwner]);

  /** Aligns with API: same order as membership created_at; always a valid option when networks exist. */
  const effectiveNetworkGroupId = useMemo(() => {
    if (ownerNetworks.length === 0) return '';
    if (networkGroupId && ownerNetworks.some((n) => n.id === networkGroupId)) {
      return networkGroupId;
    }
    return ownerNetworks[0].id;
  }, [ownerNetworks, networkGroupId]);

  async function onCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setCreateMsg(null);
    setCreateBusy(true);
    try {
      await adminCreateUser(createEmail.trim(), createPassword);
      setCreateMsg({ ok: true, text: `User ${createEmail.trim()} created with a default network.` });
      setCreateEmail('');
      setCreatePassword('');
      await loadUsers();
    } catch (err: unknown) {
      setCreateMsg({ ok: false, text: err instanceof Error ? err.message : 'Failed' });
    } finally {
      setCreateBusy(false);
    }
  }

  async function onCreateNetwork(e: React.FormEvent) {
    e.preventDefault();
    setNetMsg(null);
    setNetBusy(true);
    try {
      const ng = await adminCreateNetworkGroup(netEmail.trim(), netName.trim() || undefined);
      setNetMsg({ ok: true, text: `Network ${ng.name ?? ng.id} created (${ng.id}).` });
      setNetName('');
      if (sensorOwner.trim() === netEmail.trim()) {
        const nets = await getAdminUserNetworkGroups(netEmail.trim());
        setOwnerNetworks(nets);
        setNetworkGroupId(ng.id);
      }
    } catch (err: unknown) {
      setNetMsg({ ok: false, text: err instanceof Error ? err.message : 'Failed' });
    } finally {
      setNetBusy(false);
    }
  }

  async function onRegisterSensor(e: React.FormEvent) {
    e.preventDefault();
    setSensorMsg(null);
    const latN = parseFloat(lat);
    const lonN = parseFloat(lon);
    const depthN = parseFloat(depth);
    if (!Number.isFinite(latN) || !Number.isFinite(lonN)) {
      setSensorMsg({ ok: false, text: 'Latitude and longitude must be valid numbers.' });
      return;
    }
    if (!Number.isFinite(depthN)) {
      setSensorMsg({ ok: false, text: 'Depth must be a valid number.' });
      return;
    }
    if (!sensorOwner.trim()) {
      setSensorMsg({ ok: false, text: 'Enter owner email.' });
      return;
    }
    if (ownerNetworks.length === 0) {
      setSensorMsg({
        ok: false,
        text: 'This user has no node networks yet. Create a user or add a network first.',
      });
      return;
    }
    setSensorBusy(true);
    try {
      const s = await adminRegisterSensor({
        sensor_id: sensorId.trim(),
        owner_email: sensorOwner.trim(),
        latitude: latN,
        longitude: lonN,
        depth: depthN,
        network_group_id: effectiveNetworkGroupId,
      });
      setSensorMsg({
        ok: true,
        text: `Sensor ${s.sensor_uid} registered (network ${s.network_group_id ?? '—'}).`,
      });
      setSensorId('');
    } catch (err: unknown) {
      setSensorMsg({ ok: false, text: err instanceof Error ? err.message : 'Failed' });
    } finally {
      setSensorBusy(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-elevated)',
    borderColor: 'var(--border)',
    color: 'var(--text-primary)',
  };

  const cardClass =
    'rounded-xl border p-5 space-y-4';
  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-surface)',
    borderColor: 'var(--border)',
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Admin provisioning
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            Create users, add node networks for existing users, and register sensors with coordinates. Admin only.
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadUsers()}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs cursor-pointer"
          style={{ ...inputStyle, borderColor: 'var(--border)' }}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh user list
        </button>
      </div>

      {/* Create user */}
      <section className={cardClass} style={cardStyle}>
        <div className="flex items-center gap-2">
          <UserPlus className="w-5 h-5" style={{ color: 'var(--accent-cyan)' }} />
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Create user
          </h2>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Creates a login account and a default empty node network (same as self-registration).
        </p>
        <form onSubmit={onCreateUser} className="space-y-3 max-w-md">
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>
              Email
            </label>
            <input
              required
              type="email"
              value={createEmail}
              onChange={(e) => setCreateEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>
              Password
            </label>
            <input
              required
              type="password"
              value={createPassword}
              onChange={(e) => setCreatePassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
              style={inputStyle}
            />
          </div>
          <button
            type="submit"
            disabled={createBusy}
            className="px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer disabled:opacity-60"
            style={{ background: 'var(--accent-cyan)', color: 'var(--bg-primary)' }}
          >
            {createBusy ? 'Creating…' : 'Create user'}
          </button>
        </form>
        {createMsg && (
          <p className="text-xs" style={{ color: createMsg.ok ? 'var(--accent-teal)' : 'var(--danger-coral)' }}>
            {createMsg.text}
          </p>
        )}
      </section>

      {/* New network for existing user */}
      <section className={cardClass} style={cardStyle}>
        <div className="flex items-center gap-2">
          <Network className="w-5 h-5" style={{ color: 'var(--accent-cyan)' }} />
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Add node network for existing user
          </h2>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Use this when a user already exists and needs an additional node network (separate from their default).
        </p>
        <form onSubmit={onCreateNetwork} className="space-y-3 max-w-md">
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>
              User email
            </label>
            <input
              required
              type="email"
              list="admin-user-emails"
              value={netEmail}
              onChange={(e) => setNetEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>
              Network display name (optional)
            </label>
            <input
              type="text"
              value={netName}
              onChange={(e) => setNetName(e.target.value)}
              placeholder="e.g. East reef site"
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
              style={inputStyle}
            />
          </div>
          <button
            type="submit"
            disabled={netBusy}
            className="px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer disabled:opacity-60"
            style={{ background: 'var(--accent-cyan)', color: 'var(--bg-primary)' }}
          >
            {netBusy ? 'Creating…' : 'Create network'}
          </button>
        </form>
        {netMsg && (
          <p className="text-xs" style={{ color: netMsg.ok ? 'var(--accent-teal)' : 'var(--danger-coral)' }}>
            {netMsg.text}
          </p>
        )}
      </section>

      {/* Register sensor */}
      <section className={cardClass} style={cardStyle}>
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5" style={{ color: 'var(--accent-cyan)' }} />
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Register sensor
          </h2>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Unique sensor device ID, owner email, WGS84 latitude/longitude, depth (meters), and which of the owner&apos;s
          networks to attach.
        </p>
        <form onSubmit={onRegisterSensor} className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-3xl">
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>
              Owner email
            </label>
            <input
              required
              type="email"
              list="admin-user-emails"
              value={sensorOwner}
              onChange={(e) => setSensorOwner(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>
              Sensor UID (device ID)
            </label>
            <input
              required
              type="text"
              value={sensorId}
              onChange={(e) => setSensorId(e.target.value)}
              placeholder="e.g. hikkaduwa-net-01-node-01"
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none font-mono"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>
              Network
            </label>
            <select
              value={ownerNetworks.length === 0 ? '' : effectiveNetworkGroupId}
              onChange={(e) => setNetworkGroupId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none cursor-pointer"
              style={inputStyle}
              disabled={!sensorOwner.trim() || ownerNetworks.length === 0}
            >
              {ownerNetworks.length === 0 ? (
                <option value="">Enter owner email to load networks</option>
              ) : (
                ownerNetworks.map((n) => (
                  <option key={n.id} value={n.id}>
                    {(n.name || n.id) + ` (${n.id})`}
                  </option>
                ))
              )}
            </select>
            <p className="text-[10px] mt-1" style={{ color: 'var(--text-secondary)' }}>
              Order: oldest membership first. With multiple networks, pick the target explicitly.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>
                Latitude
              </label>
              <input
                required
                type="text"
                inputMode="decimal"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="6.139"
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none font-mono"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>
                Longitude
              </label>
              <input
                required
                type="text"
                inputMode="decimal"
                value={lon}
                onChange={(e) => setLon(e.target.value)}
                placeholder="80.092"
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none font-mono"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>
                Depth (m)
              </label>
              <input
                required
                type="text"
                inputMode="decimal"
                value={depth}
                onChange={(e) => setDepth(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none font-mono"
                style={inputStyle}
              />
            </div>
          </div>
          <div className="lg:col-span-2">
            <button
              type="submit"
              disabled={sensorBusy}
              className="px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer disabled:opacity-60"
              style={{ background: 'var(--accent-cyan)', color: 'var(--bg-primary)' }}
            >
              {sensorBusy ? 'Registering…' : 'Register sensor'}
            </button>
          </div>
        </form>
        {sensorMsg && (
          <p className="text-xs" style={{ color: sensorMsg.ok ? 'var(--accent-teal)' : 'var(--danger-coral)' }}>
            {sensorMsg.text}
          </p>
        )}
      </section>

      <datalist id="admin-user-emails">
        {loadingUsers ? (
          <option value="loading…" />
        ) : (
          users.map((u) => <option key={u.id} value={u.email} />)
        )}
      </datalist>

      <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
        {loadingUsers ? 'Loading users…' : `${users.length} user(s) in system.`}
      </p>
    </div>
  );
}
