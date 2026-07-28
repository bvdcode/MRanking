"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WheelRun, WheelSettings } from "../../../lib/types";
import {
  activeWheelEntries,
  buildWheelSegments,
  countWheelBoundaryCrossings,
  createWheelSpinPlan,
  eliminateWheelEntry,
  normalizedAngularSpeed,
  positiveModulo,
  sampleWheelSpin,
  shouldShowWheelSoClose,
  skipWheelSpin,
  type WheelEntry,
  type WheelSpinPlan,
  type WheelSpinSample,
} from "../../domain/wheel";
import { WheelSoundEngine } from "../../domain/wheelSound";
import {
  makeWheelSnapshot,
  persistWheelEntries,
  withWheelState,
} from "../../domain/wheelState";

type UseWheelSpinOptions = {
  run: WheelRun;
  entries: WheelEntry[];
  settings: WheelSettings;
  archived: boolean;
  onChange?: (run: WheelRun) => void;
};

export function useWheelSpin({
  run,
  entries,
  settings,
  archived,
  onChange,
}: UseWheelSpinOptions) {
  const [spinning, setSpinning] = useState(false);
  const [spinPhase, setSpinPhase] = useState<
    WheelSpinSample["phase"] | "idle"
  >("idle");
  const [showSoClose, setShowSoClose] = useState(false);
  const [landedId, setLandedId] = useState<string | null>(null);
  const frameRef = useRef<number | null>(null);
  const spinPlanRef = useRef<WheelSpinPlan | null>(null);
  const rotationRef = useRef(run.state.rotation);
  const rotationElementRef = useRef<SVGGElement | null>(null);
  const boundaryAnglesRef = useRef<number[]>([]);
  const previousFrameAtRef = useRef(0);
  const spinPhaseRef = useRef<WheelSpinSample["phase"] | "idle">("idle");
  const showSoCloseRef = useRef(false);
  const soundRef = useRef<WheelSoundEngine | null>(null);
  const spinTokenRef = useRef(0);
  const runRef = useRef(run);
  const entriesRef = useRef(entries);
  const onChangeRef = useRef(onChange);

  const setWheelRotation = useCallback((rotation: number) => {
    rotationElementRef.current?.setAttribute(
      "transform",
      `rotate(${rotation} 250 250)`,
    );
  }, []);

  const wheelRotationRef = useCallback((element: SVGGElement | null) => {
    rotationElementRef.current = element;
    if (element) {
      element.setAttribute(
        "transform",
        `rotate(${rotationRef.current} 250 250)`,
      );
    }
  }, []);

  useEffect(() => {
    runRef.current = run;
    entriesRef.current = entries;
    onChangeRef.current = onChange;
    if (!spinPlanRef.current) {
      rotationRef.current = run.state.rotation;
      setWheelRotation(run.state.rotation);
    }
  }, [entries, onChange, run, setWheelRotation]);

  useEffect(() => {
    const engine = new WheelSoundEngine();
    soundRef.current = engine;
    return () => {
      spinTokenRef.current += 1;
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
      engine.dispose();
      soundRef.current = null;
    };
  }, []);

  useEffect(() => {
    soundRef.current?.setEnabled(settings.soundEnabled);
    soundRef.current?.setVolume(settings.volume);
  }, [settings.soundEnabled, settings.volume]);

  useEffect(() => {
    if (!landedId) {
      return;
    }
    const timer = window.setTimeout(() => setLandedId(null), 950);
    return () => window.clearTimeout(timer);
  }, [landedId]);

  const finishSpin = useCallback((plan: WheelSpinPlan) => {
    const currentRun = runRef.current;
    const currentEntries = entriesRef.current;
    const update = onChangeRef.current;
    const finalRotation = positiveModulo(plan.targetRotation);
    rotationRef.current = finalRotation;
    setWheelRotation(finalRotation);
    setSpinning(false);
    spinPhaseRef.current = "idle";
    setSpinPhase("idle");
    showSoCloseRef.current = false;
    setShowSoClose(false);
    spinPlanRef.current = null;
    setLandedId(plan.winnerId);

    if (!update) {
      return;
    }

    const before = makeWheelSnapshot(
      currentEntries,
      currentRun.state.winnerItemId,
      currentRun.state.rotation,
    );
    if (currentRun.state.mode === "classic") {
      soundRef.current?.winner();
      update(
        withWheelState(currentRun, {
          status: "complete",
          winnerItemId: plan.winnerId,
          auto: false,
          rotation: finalRotation,
          undoStack: currentRun.state.undoStack,
          redoStack: [],
        }),
      );
      return;
    }

    const nextEntries = eliminateWheelEntry(currentEntries, plan.winnerId);
    const remaining = activeWheelEntries(nextEntries);
    const complete = remaining.length === 1;
    if (complete) {
      soundRef.current?.winner();
    } else {
      soundRef.current?.stopSpin(100);
      soundRef.current?.tick(1);
    }
    update(
      withWheelState(currentRun, {
        entries: persistWheelEntries(nextEntries),
        status: complete ? "complete" : "active",
        winnerItemId: complete ? remaining[0].itemId : null,
        auto: complete ? false : currentRun.state.auto,
        rotation: finalRotation,
        undoStack: [...currentRun.state.undoStack.slice(-19), before],
        redoStack: [],
      }),
    );
  }, [setWheelRotation]);

  const animateSpin = useCallback(
    (plan: WheelSpinPlan) => {
      spinPlanRef.current = plan;
      boundaryAnglesRef.current = buildWheelSegments(entriesRef.current).map(
        (segment) => segment.startAngle,
      );
      previousFrameAtRef.current = plan.startedAt;
      const step = () => {
        const activePlan = spinPlanRef.current;
        if (!activePlan) {
          return;
        }
        const now = Date.now();
        const sample = sampleWheelSpin(activePlan, now);
        const nextShowSoClose = shouldShowWheelSoClose(activePlan, now);
        if (nextShowSoClose !== showSoCloseRef.current) {
          showSoCloseRef.current = nextShowSoClose;
          setShowSoClose(nextShowSoClose);
        }
        if (sample.phase !== spinPhaseRef.current) {
          spinPhaseRef.current = sample.phase;
          setSpinPhase(sample.phase);
        }
        const previousRotation = rotationRef.current;
        const speed = normalizedAngularSpeed(
          previousRotation,
          sample.rotation,
          now - previousFrameAtRef.current,
        );
        const boundaryCrossings = countWheelBoundaryCrossings(
          boundaryAnglesRef.current,
          previousRotation,
          sample.rotation,
        );
        rotationRef.current = sample.rotation;
        previousFrameAtRef.current = now;
        setWheelRotation(sample.rotation);
        soundRef.current?.setSpinSpeed(speed);
        if (boundaryCrossings > 0) {
          soundRef.current?.tick(Math.max(0.18, speed));
        }
        if (sample.done) {
          frameRef.current = null;
          finishSpin(activePlan);
          return;
        }
        frameRef.current = window.requestAnimationFrame(step);
      };
      frameRef.current = window.requestAnimationFrame(step);
    },
    [finishSpin, setWheelRotation],
  );

  const spin = useCallback(async () => {
    const activeCount = activeWheelEntries(entries).length;
    if (archived || spinning || run.state.status !== "active" || activeCount < 2) {
      return;
    }
    const token = spinTokenRef.current + 1;
    spinTokenRef.current = token;
    const startRotation = run.state.rotation;
    rotationRef.current = startRotation;
    setWheelRotation(startRotation);
    setLandedId(null);
    showSoCloseRef.current = false;
    setShowSoClose(false);
    setSpinning(true);
    spinPhaseRef.current = "coasting";
    setSpinPhase("coasting");
    await soundRef.current?.resume().catch(() => {
      // Audio permission failures must never prevent the visual spin.
    });
    if (spinTokenRef.current !== token) {
      return;
    }
    const plan = createWheelSpinPlan(
      entries,
      startRotation,
      settings.durationSeconds,
    );
    if (!plan) {
      setSpinning(false);
      spinPhaseRef.current = "idle";
      setSpinPhase("idle");
      return;
    }
    soundRef.current?.startSpin();
    animateSpin(plan);
  }, [animateSpin, archived, entries, run.state.rotation, run.state.status, setWheelRotation, settings.durationSeconds, spinning]);

  useEffect(() => {
    if (
      archived ||
      spinning ||
      run.state.mode !== "lastOneStanding" ||
      !run.state.auto ||
      run.state.status !== "active" ||
      activeWheelEntries(entries).length < 2
    ) {
      return;
    }
    const timer = window.setTimeout(() => void spin(), 1_000);
    return () => window.clearTimeout(timer);
  }, [archived, entries, run.state.auto, run.state.mode, run.state.status, spin, spinning]);

  const cancelAnimation = useCallback(() => {
    spinTokenRef.current += 1;
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    spinPlanRef.current = null;
    soundRef.current?.stopSpin(80);
    setSpinning(false);
    spinPhaseRef.current = "idle";
    setSpinPhase("idle");
    showSoCloseRef.current = false;
    setShowSoClose(false);
    rotationRef.current = runRef.current.state.rotation;
    setWheelRotation(runRef.current.state.rotation);
  }, [setWheelRotation]);

  const skipSpinning = useCallback(() => {
    if (!spinPlanRef.current || !spinning) {
      return;
    }
    spinPlanRef.current = skipWheelSpin(
      spinPlanRef.current,
      rotationRef.current,
      Date.now(),
      850,
    );
    showSoCloseRef.current = false;
    setShowSoClose(false);
    soundRef.current?.tick(1);
  }, [spinning]);

  return {
    spinning,
    spinPhase,
    showSoClose,
    wheelRotationRef,
    landedId,
    spin,
    skipSpinning,
    cancelAnimation,
  };
}
