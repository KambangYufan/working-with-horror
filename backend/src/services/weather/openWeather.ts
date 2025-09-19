import { ACCUWEATHER_API_KEY } from "../../config/env.ts";

const ACCU_BASE = "https://dataservice.accuweather.com";

// Tweak these to taste (all metric)
const GOOD_TEMP_C = 15;       // >= 15°C
const MAX_RAIN_PROB = 0.30;   // <= 30 %
const MAX_WIND_KPH = 35;      // optional wind cap to keep “good” days pleasant

// Shapes you already use in tests
export type Daily = {
    temp: { day: number };
    pop?: number
};
export type WeekendForecast = {
    goodWeather: boolean;
    alerts: unknown[]; daily:
    Daily[]
};

// --- AccuWeather response shapes (minimal bits we read) ---
type AccuLocation = { Key: string };
type Accu5Day = {
    DailyForecasts: Array<{
        Date: string;
        Temperature: { Minimum: { Value: number }, Maximum: { Value: number } };
        Day: {
            PrecipitationProbability?: number; // 0..100
            Wind?: { Speed?: { Value?: number; Unit?: string } }; // e.g., km/h when metric=true
        };
    }>;
};
type AccuAlert = unknown[]; // pass through; shape varies by region/plan

// 1) lat/lon -> location key
async function getLocationKey(lat: number, lon: number): Promise<string> {
    const url =
        `${ACCU_BASE}/locations/v1/cities/geoposition/search` +
        `?apikey=${ACCUWEATHER_API_KEY}&q=${lat},${lon}`;
    const res = await fetch(url);
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Accu location error ${res.status}: ${text}`);
    }
    const json = (await res.json()) as AccuLocation | null;
    if (!json?.Key) {
        throw new Error("Accu location lookup returned no Key");
    };
    return json.Key;
}

// 2) 5-day forecast (metric=true gives °C and km/h)
async function get5DayForecast(locationKey: string): Promise<Accu5Day> {
    const url =
        `${ACCU_BASE}/forecasts/v1/daily/5day/${locationKey}` +
        `?apikey=${ACCUWEATHER_API_KEY}&metric=true&details=true`;
    const res = await fetch(url);
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Accu 5-day error ${res.status}: ${text}`);
    }
    return (await res.json()) as Accu5Day;
}

// 3) Active alerts (will be [] if none)
async function getActiveAlerts(locationKey: string): Promise<AccuAlert> {
    const url = `${ACCU_BASE}/alerts/v1/${locationKey}?apikey=${ACCUWEATHER_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) {
        // Some regions/tiers may not have alerts; treat non-200 as “no alerts” but log once
        const text = await res.text().catch(() => "");
        console.warn("Accu alerts warning:", res.status, text);
        return [];
    }
    return (await res.json()) as AccuAlert;
}

// 4) Public helper your route can call
export async function getWeekendForecast(lat: number, lon: number): Promise<WeekendForecast> {
    const la = Number(lat), lo = Number(lon);
    if (!Number.isFinite(la) || !Number.isFinite(lo)) {
        throw new Error(`Invalid coordinates: lat=${lat}, lon=${lon}`);
    }

    const key = await getLocationKey(la, lo);
    const [fiveDay, alerts] = await Promise.all([
        get5DayForecast(key),
        getActiveAlerts(key),
    ]);

    const df = Array.isArray(fiveDay?.DailyForecasts) ? fiveDay.DailyForecasts : [];
    // Weekend window: next 3 daily periods (adjust if you want strict Fri-Sun logic)
    const window = df.slice(0, 3);

    // Map Accu objects -> your Daily shape
    const daily: Daily[] = window.map((d) => {
        const maxC = d?.Temperature?.Maximum?.Value ?? NaN; // metric=true => °C
        const pop = (d?.Day?.PrecipitationProbability ?? 0) / 100; // 0..1
        return { temp: { day: maxC }, pop };
    });

    // “Good” = warm enough, low rain chance, (optional) not too windy
    const good = daily.length > 0 && window.every((d) => {
        const maxC = d?.Temperature?.Maximum?.Value ?? NaN;
        const pop = (d?.Day?.PrecipitationProbability ?? 0) / 100;
        const wind = d?.Day?.Wind?.Speed?.Value; // already metric (km/h) when metric=true
        const windOk = typeof wind === "number" ? wind <= MAX_WIND_KPH : true;
        return Number.isFinite(maxC) && maxC >= GOOD_TEMP_C && pop <= MAX_RAIN_PROB && windOk;
    });

    return {
        goodWeather: Boolean(good),
        alerts: Array.isArray(alerts) ? alerts : [],
        daily,
    };
}