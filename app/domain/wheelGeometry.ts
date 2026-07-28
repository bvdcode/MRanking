export type WheelSliceGeometry = {
  path: string;
  labelX: number;
  labelY: number;
};

type MotionProgress = {
  progress: number;
  accelerating: boolean;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function polarPoint(centerX: number, centerY: number, radius: number, angle: number) {
  const radians = (angle * Math.PI) / 180;
  return {
    x: centerX + radius * Math.sin(radians),
    y: centerY - radius * Math.cos(radians),
  };
}

export function wheelSliceGeometry(
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  labelAngle: number,
): WheelSliceGeometry {
  const start = polarPoint(centerX, centerY, radius, startAngle);
  const end = polarPoint(centerX, centerY, radius, endAngle);
  const label = polarPoint(centerX, centerY, radius * 0.62, labelAngle);
  const sweep = endAngle - startAngle;
  if (sweep >= 359.999999) {
    const middle = polarPoint(centerX, centerY, radius, startAngle + 180);
    return {
      path: `M ${start.x} ${start.y} A ${radius} ${radius} 0 1 1 ${middle.x} ${middle.y} A ${radius} ${radius} 0 1 1 ${start.x} ${start.y} Z`,
      labelX: label.x,
      labelY: label.y,
    };
  }
  const largeArc = sweep > 180 ? 1 : 0;
  return {
    path: `M ${centerX} ${centerY} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`,
    labelX: label.x,
    labelY: label.y,
  };
}

export function accelerateCruiseProgress(
  elapsedMs: number,
  durationMs: number,
): MotionProgress {
  if (durationMs <= 0 || elapsedMs >= durationMs) {
    return { progress: 1, accelerating: false };
  }
  const elapsed = clamp(elapsedMs, 0, durationMs);
  const acceleration = Math.min(700, durationMs * 0.3);
  const area = durationMs - acceleration / 2;
  if (elapsed < acceleration) {
    return {
      progress: (elapsed * elapsed) / (2 * acceleration * area),
      accelerating: true,
    };
  }
  return {
    progress: (acceleration / 2 + elapsed - acceleration) / area,
    accelerating: false,
  };
}

export function cruiseBrakeProgress(
  elapsedMs: number,
  durationMs: number,
): MotionProgress {
  if (durationMs <= 0 || elapsedMs >= durationMs) {
    return { progress: 1, accelerating: false };
  }
  const elapsed = clamp(elapsedMs, 0, durationMs);
  let acceleration = Math.min(700, durationMs * 0.18);
  let braking = Math.min(1_800, durationMs * 0.34);
  if (acceleration + braking > durationMs * 0.8) {
    const scale = (durationMs * 0.8) / (acceleration + braking);
    acceleration *= scale;
    braking *= scale;
  }
  const cruise = durationMs - acceleration - braking;
  const area = cruise + (acceleration + braking) / 2;
  if (elapsed < acceleration) {
    return {
      progress: (elapsed * elapsed) / (2 * acceleration * area),
      accelerating: true,
    };
  }
  if (elapsed <= acceleration + cruise) {
    return {
      progress: (acceleration / 2 + elapsed - acceleration) / area,
      accelerating: false,
    };
  }
  const brakingElapsed = elapsed - acceleration - cruise;
  const traveled = acceleration / 2 + cruise
    + brakingElapsed - (brakingElapsed * brakingElapsed) / (2 * braking);
  return { progress: traveled / area, accelerating: false };
}

function smootherStep(value: number) {
  return value * value * value * (value * (value * 6 - 15) + 10);
}

function easeOutCubic(value: number) {
  return 1 - (1 - value) ** 3;
}

export function suspenseTailProgress(value: number) {
  const progress = clamp(value, 0, 1);
  if (progress < 0.36) {
    return 0.38 * easeOutCubic(progress / 0.36);
  }
  if (progress < 0.52) {
    return 0.38 + 0.04 * smootherStep((progress - 0.36) / 0.16);
  }
  if (progress < 0.78) {
    return 0.42 + 0.34 * smootherStep((progress - 0.52) / 0.26);
  }
  return 0.76 + 0.24 * smootherStep((progress - 0.78) / 0.22);
}

export function countWheelBoundaryCrossings(
  boundaryAngles: number[],
  previousRotation: number,
  nextRotation: number,
) {
  if (nextRotation <= previousRotation) {
    return 0;
  }
  return boundaryAngles.reduce((count, angle) => {
    const before = Math.floor((previousRotation + angle) / 360);
    const after = Math.floor((nextRotation + angle) / 360);
    return count + Math.max(0, after - before);
  }, 0);
}

export function normalizedAngularSpeed(
  previousRotation: number,
  nextRotation: number,
  elapsedMs: number,
  referenceDegreesPerSecond = 720,
) {
  if (elapsedMs <= 0 || referenceDegreesPerSecond <= 0) {
    return 0;
  }
  const degreesPerSecond = Math.abs(nextRotation - previousRotation) * 1_000 / elapsedMs;
  return clamp(degreesPerSecond / referenceDegreesPerSecond, 0, 1);
}
