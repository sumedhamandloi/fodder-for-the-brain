import { useWorld, Weather } from '../state/world';

/**
 * Local weather via Open-Meteo, only after the person asks for it.
 * Privacy: the browser asks permission; coordinates are rounded to 0.1° (about 11 km) and used once for the
 * request. Only the resulting weather state and hemisphere are kept, never the coordinates.
 */
const CACHE = 'fodder.weather.v1';
const MAX_AGE = 30 * 60_000;

/** WMO weather codes → our gentle set. */
export function fromWmo(code: number): Weather {
  if (code === 0 || code === 1) return 'clear';
  if (code === 2 || code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if ([51, 53, 55, 56, 57, 61, 80].includes(code)) return 'light_rain';
  if ([63, 65, 66, 67, 81, 82].includes(code)) return 'heavy_rain';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow';
  if ([95, 96, 99].includes(code)) return 'storm';
  return 'cloudy';
}

function cached(): Weather | null {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE) ?? 'null');
    return c && Date.now() - c.at < MAX_AGE ? (c.state as Weather) : null;
  } catch {
    return null;
  }
}

export async function matchLocalWeather(): Promise<Weather> {
  const hit = cached();
  if (hit) {
    useWorld.getState().set({ localWeather: hit, weatherMode: 'auto' });
    return hit;
  }
  const pos = await new Promise<GeolocationPosition>((res, rej) =>
    navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: false, maximumAge: 3_600_000, timeout: 15_000 }),
  );
  const lat = Math.round(pos.coords.latitude * 10) / 10;
  const lon = Math.round(pos.coords.longitude * 10) / 10;
  const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=weather_code`);
  if (!r.ok) throw new Error('The weather service is resting. Try again later.');
  const data = await r.json();
  const state = fromWmo(Number(data?.current?.weather_code ?? 0));
  try {
    localStorage.setItem(CACHE, JSON.stringify({ state, at: Date.now() }));
  } catch {
    /* fine */
  }
  useWorld.getState().set({ localWeather: state, weatherMode: 'auto', hemisphere: lat < 0 ? 'S' : 'N' });
  return state;
}

/** Refresh quietly if the person already chose to match local weather. */
export function refreshLocalWeatherIfChosen() {
  const s = useWorld.getState();
  if (s.weatherMode !== 'auto') return;
  const hit = cached();
  if (hit) s.set({ localWeather: hit });
  else if ('geolocation' in navigator) matchLocalWeather().catch(() => undefined);
}
