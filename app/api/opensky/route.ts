import { NextResponse } from "next/server";

export const runtime = "nodejs";

type OpenSkyState = {
  icao24: string;
  callsign: string | null;
  originCountry: string;
  longitude: number | null;
  latitude: number | null;
  trueTrack: number | null;
};

type OpenSkyPayload = {
  time: number;
  states: unknown[] | null;
};

const OPEN_SKY_ENDPOINT = "https://opensky-network.org/api/states/all";
const DEFAULT_LIMIT = 250;
const MAX_LIMIT = 1000;

function parseLimit(value: string | null) {
  if (!value) return DEFAULT_LIMIT;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

function limitStates(states: OpenSkyState[], limit: number) {
  if (states.length <= limit) return states;
  const step = Math.ceil(states.length / limit);
  return states.filter((_, index) => index % step === 0).slice(0, limit);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = new URLSearchParams();

  for (const key of ["lamin", "lomin", "lamax", "lomax"]) {
    const value = url.searchParams.get(key);
    if (value) {
      params.set(key, value);
    }
  }

  const limit = parseLimit(url.searchParams.get("limit"));
  const endpoint = params.toString()
    ? `${OPEN_SKY_ENDPOINT}?${params}`
    : OPEN_SKY_ENDPOINT;

  const headers: HeadersInit = {};
  const username = process.env.OPEN_SKY_USERNAME;
  const password = process.env.OPEN_SKY_PASSWORD;

  if (username && password) {
    const token = Buffer.from(`${username}:${password}`).toString("base64");
    headers.Authorization = `Basic ${token}`;
  }

  const response = await fetch(endpoint, {
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "OpenSky request failed", status: response.status },
      { status: response.status }
    );
  }

  const payload = (await response.json()) as OpenSkyPayload;
  const states = Array.isArray(payload.states) ? payload.states : [];
  const normalized = states
    .filter((state) => Array.isArray(state))
    .map((state) => ({
      icao24: typeof state[0] === "string" ? state[0] : "",
      callsign: typeof state[1] === "string" ? state[1].trim() : null,
      originCountry: typeof state[2] === "string" ? state[2] : "",
      longitude: typeof state[5] === "number" ? state[5] : null,
      latitude: typeof state[6] === "number" ? state[6] : null,
      trueTrack: typeof state[10] === "number" ? state[10] : null,
    }))
    .filter((state) => state.icao24);

  const trimmed = limitStates(normalized, limit);

  return NextResponse.json({
    time: typeof payload.time === "number" ? payload.time : Date.now(),
    states: trimmed,
  });
}
