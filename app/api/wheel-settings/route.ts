import { getD1, jsonError, requireUser } from "../../../lib/server";
import type { WheelSettings } from "../../../lib/types";

const DEFAULT_SETTINGS: WheelSettings = {
  durationSeconds: 5,
  soundEnabled: true,
  volume: 0.65,
};

type SettingsRow = {
  duration_seconds: number;
  sound_enabled: number;
  volume: number;
};

export async function GET(request: Request) {
  try {
    const auth = await requireUser(request);
    if (auth.response || !auth.user) {
      return auth.response;
    }
    const row = await getD1()
      .prepare(
        "SELECT duration_seconds, sound_enabled, volume FROM wheel_settings WHERE user_id = ?",
      )
      .bind(auth.user.id)
      .first<SettingsRow>();
    return Response.json({ settings: row ? settingsFromRow(row) : DEFAULT_SETTINGS });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requireUser(request);
    if (auth.response || !auth.user) {
      return auth.response;
    }
    const body = (await request.json()) as { settings?: Partial<WheelSettings> };
    const currentRow = await getD1()
      .prepare(
        "SELECT duration_seconds, sound_enabled, volume FROM wheel_settings WHERE user_id = ?",
      )
      .bind(auth.user.id)
      .first<SettingsRow>();
    const current = currentRow ? settingsFromRow(currentRow) : DEFAULT_SETTINGS;
    const settings: WheelSettings = {
      durationSeconds: body.settings?.durationSeconds ?? current.durationSeconds,
      soundEnabled: body.settings?.soundEnabled ?? current.soundEnabled,
      volume: body.settings?.volume ?? current.volume,
    };
    const validation = validateSettings(settings);
    if (validation) {
      return Response.json({ error: validation }, { status: 400 });
    }
    const now = new Date().toISOString();
    await getD1()
      .prepare(
        `INSERT INTO wheel_settings (user_id, duration_seconds, sound_enabled, volume, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET
           duration_seconds = excluded.duration_seconds,
           sound_enabled = excluded.sound_enabled,
           volume = excluded.volume,
           updated_at = excluded.updated_at`,
      )
      .bind(
        auth.user.id,
        settings.durationSeconds,
        settings.soundEnabled ? 1 : 0,
        settings.volume,
        now,
      )
      .run();
    return Response.json({ settings });
  } catch (error) {
    return jsonError(error);
  }
}

function settingsFromRow(row: SettingsRow): WheelSettings {
  return {
    durationSeconds: row.duration_seconds,
    soundEnabled: Boolean(row.sound_enabled),
    volume: row.volume,
  };
}

function validateSettings(settings: WheelSettings) {
  if (
    !Number.isInteger(settings.durationSeconds) ||
    settings.durationSeconds < 3 ||
    settings.durationSeconds > 180
  ) {
    return "Spin duration must be a whole number from 3 to 180 seconds";
  }
  if (typeof settings.soundEnabled !== "boolean") {
    return "Sound setting must be true or false";
  }
  if (
    !Number.isFinite(settings.volume) ||
    settings.volume < 0 ||
    settings.volume > 1
  ) {
    return "Volume must be between 0 and 1";
  }
  return null;
}
