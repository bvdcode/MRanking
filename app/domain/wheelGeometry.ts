export type WheelSliceGeometry = {
  path: string;
  labelX: number;
  labelY: number;
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

export function wheelLandingBoundaryDistance(
  segment: { startAngle: number; sweepAngle: number },
  landingAngle: number,
) {
  if (!Number.isFinite(segment.sweepAngle) || segment.sweepAngle <= 0) {
    return null;
  }
  const relativeAngle = ((landingAngle - segment.startAngle) % 360 + 360) % 360;
  if (relativeAngle > segment.sweepAngle + Number.EPSILON) {
    return null;
  }
  return Math.max(0, Math.min(relativeAngle, segment.sweepAngle - relativeAngle));
}

export function isWheelLandingNearBoundary(
  segment: { startAngle: number; sweepAngle: number },
  landingAngle: number,
  maximumDistance = 3,
) {
  const distance = wheelLandingBoundaryDistance(segment, landingAngle);
  const threshold = Math.min(
    Math.max(0, maximumDistance),
    segment.sweepAngle * 0.2,
  );
  return distance !== null
    && distance > Number.EPSILON
    && distance <= threshold + Number.EPSILON;
}

export function deceleratingWheelProgress(elapsedMs: number, durationMs: number) {
  if (durationMs <= 0 || elapsedMs >= durationMs) {
    return 1;
  }
  const normalized = clamp(elapsedMs / durationMs, 0, 1);
  // Short spins need a stronger slow finish. On long spins the exponent eases
  // toward linear velocity decay so the wheel keeps visibly moving.
  const velocityPower = 1 + Math.min(1, 6_000 / durationMs);
  return 1 - (1 - normalized) ** (velocityPower + 1);
}
