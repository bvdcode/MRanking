import type {
  WheelMode,
  WheelRun,
  WheelStateSnapshot,
} from "../../../lib/types";

export function wheelResultAsRun(
  result: {
    id: string;
    packId: string;
    state: {
      mode: WheelMode;
      entries: WheelStateSnapshot["entries"];
      winnerItemId: string;
      rotation: number;
    };
    completedAt: string;
  },
): WheelRun {
  return {
    id: result.id,
    packId: result.packId,
    updatedAt: result.completedAt,
    state: {
      mode: result.state.mode,
      entries: result.state.entries,
      status: "complete",
      winnerItemId: result.state.winnerItemId,
      auto: false,
      undoStack: [],
      redoStack: [],
      rotation: result.state.rotation,
      updatedAt: result.completedAt,
    },
  };
}
