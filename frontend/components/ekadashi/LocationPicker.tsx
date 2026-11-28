import React, { useMemo, useState } from 'react';
import { Crosshair, MapPin, Search, X, Check, Loader2 } from 'lucide-react';
import type { EkadashiLocation } from '../../utils/ekadashi/calendar';
import { PRESET_LOCATIONS, nearestPreset } from '../../utils/ekadashi/locations';

interface Props {
  current: EkadashiLocation;
  onSelect: (l: EkadashiLocation) => void;
  onClose: () => void;
}

const LocationPicker: React.FC<Props> = ({ current, onSelect, onClose }) => {
  const [q, setQ] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [suggestion, setSuggestion] = useState<{ custom: EkadashiLocation; nearest: EkadashiLocation; km: number } | null>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return PRESET_LOCATIONS;
    return PRESET_LOCATIONS.filter((l) => l.name.toLowerCase().includes(s) || (l.country || '').toLowerCase().includes(s));
  }, [q]);

  const grouped = useMemo(() => {
    const m = new Map<string, EkadashiLocation[]>();
    for (const l of filtered) {
      const k = l.country || 'Other';
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(l);
    }
    return [...m.entries()];
  }, [filtered]);

  const detect = () => {
    setGeoError('');
    if (!('geolocation' in navigator)) {
      setGeoError('Location is not available in this browser. Please choose your city below.');
      return;
    }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        let tz = 'UTC';
        try {
          tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        } catch {
          /* ignore */
        }
        const { location: nearest, km } = nearestPreset(lat, lon);
        const custom: EkadashiLocation = {
          id: `geo_${lat.toFixed(2)}_${lon.toFixed(2)}`,
          name: km < 40 ? `Near ${nearest.name}` : 'My location',
          country: km < 40 ? nearest.country : undefined,
          lat: Number(lat.toFixed(4)),
          lon: Number(lon.toFixed(4)),
          tz,
          custom: true,
        };
        setSuggestion({ custom, nearest, km });
        setDetecting(false);
      },
      (err) => {
        setDetecting(false);
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission was declined. You can choose your city from the list instead.'
            : 'Could not detect your location. Please choose your city below.'
        );
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 10 * 60 * 1000 }
    );
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Choose location">
      <div className="absolute inset-0 bg-maroon-900/40 backdrop-blur-sm animate-fadeIn" onClick={onClose} />
      <div className="relative flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-sandal-50 shadow-2xl animate-scale-in sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-sandal-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-maroon-900">Your location</h2>
            <p className="text-xs text-maroon-900/55">Ekadashi dates and parana times depend on local sunrise.</p>
          </div>
          <button onClick={onClose} className="icon-btn" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <button onClick={detect} disabled={detecting} className="btn-secondary w-full justify-start">
            {detecting ? <Loader2 size={16} className="animate-spin" /> : <Crosshair size={16} className="text-brand-600" />}
            {detecting ? 'Detecting your location…' : 'Use my current location'}
          </button>
          {geoError && <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">{geoError}</p>}

          {suggestion && (
            <div className="space-y-2 rounded-2xl bg-white p-3 ring-1 ring-sandal-200">
              <p className="text-xs text-maroon-900/70">
                Found you {suggestion.km < 1 ? 'right at' : `about ${Math.round(suggestion.km)} km from`} <b>{suggestion.nearest.name}</b>.
              </p>
              {suggestion.km < 60 && (
                <button
                  className="btn-primary btn-sm w-full"
                  onClick={() => {
                    onSelect(suggestion.nearest);
                    onClose();
                  }}
                >
                  Use {suggestion.nearest.name} (supports verified dates)
                </button>
              )}
              <button
                className="btn-secondary btn-sm w-full"
                onClick={() => {
                  onSelect(suggestion.custom);
                  onClose();
                }}
              >
                Use my exact coordinates (calculated only)
              </button>
            </div>
          )}

          <label className="relative block">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input className="field pl-9" placeholder="Search city or country…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
          </label>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-4">
          {grouped.length === 0 && <p className="px-2 py-6 text-center text-sm text-maroon-900/50">No matching city. Try “Use my current location”.</p>}
          {grouped.map(([country, list]) => (
            <div key={country} className="mb-2">
              <p className="eyebrow px-2 py-1.5">{country}</p>
              {list.map((l) => {
                const active = !current.custom && current.id === l.id;
                return (
                  <button
                    key={l.id}
                    onClick={() => {
                      onSelect(l);
                      onClose();
                    }}
                    className={`menu-row ${active ? 'bg-white text-maroon-900 shadow-sm ring-1 ring-sandal-200' : ''}`}
                  >
                    <MapPin size={15} className={active ? 'text-brand-600' : 'text-maroon-900/35'} />
                    <span className="flex-1">{l.name}</span>
                    <span className="text-[11px] text-maroon-900/40">{l.tz.split('/').pop()?.replace(/_/g, ' ')}</span>
                    {active && <Check size={15} className="text-brand-600" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LocationPicker;
