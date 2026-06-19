import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, Check, Plus, Minus, Timer as TimerIcon, X } from "lucide-react";

// ---------- DATA ----------

const DAYS = {
  push: {
    label: "Push",
    exercises: [
      { id: "flat_bench", name: "Flat Bench Press", tag: "Mid Chest" },
      { id: "incline_bench", name: "Incline Bench Press", tag: "Upper Chest" },
      { id: "decline_bench", name: "Decline Bench Press", tag: "Lower Chest" },
      { id: "shoulder_press", name: "Shoulder Press", tag: "Front Delt" },
      { id: "lateral_raise", name: "Lateral Raise", tag: "Side Delt" },
      { id: "rear_delt", name: "Rear Delt Fly", tag: "Rear Delt" },
      { id: "rope_pushdown", name: "Rope Pushdown", tag: "Lateral Head" },
      { id: "overhead_ext", name: "Overhead Extension", tag: "Long Head" },
      { id: "dips", name: "Dips", tag: "Lower Chest / Triceps" },
    ],
  },
  pull: {
    label: "Pull",
    exercises: [
      { id: "lat_pulldown", name: "Lat Pulldown", tag: "Lats" },
      { id: "back_pulldown", name: "Back Pulldown", tag: "Upper Back" },
      { id: "t_bar_row", name: "T-Bar Row", tag: "Lats / Mid Back" },
      { id: "deadlift", name: "Deadlift", tag: "Lower Back" },
      { id: "db_curl", name: "Dumbbell Curl", tag: "Biceps — Long Head" },
      { id: "preacher_curl", name: "Preacher Curl", tag: "Biceps — Short Head" },
      { id: "hammer_curl", name: "Hammer Curl", tag: "Brachialis" },
      { id: "dead_hang", name: "Dead Hang", tag: "Forearm — Grip" },
      { id: "wrist_ext", name: "Wrist Extension", tag: "Forearm — Extensor" },
      { id: "farmer_carry", name: "Farmer Carry", tag: "Forearm — Grip" },
    ],
  },
  legs: {
    label: "Legs",
    exercises: [
      { id: "squat", name: "Squat", tag: "Quads" },
      { id: "leg_press", name: "Leg Press", tag: "Quads" },
      { id: "leg_extension", name: "Leg Extension", tag: "Quads" },
      { id: "hamstring_curl", name: "Hamstring Curl", tag: "Hamstrings" },
      { id: "calf_raise", name: "Calf Raise", tag: "Calves" },
      { id: "ab_work", name: "Ab Work", tag: "Abs" },
    ],
  },
};

const REST_DEFAULTS = {
  compound: 150, // 2.5 min — squat, deadlift, bench, press
  isolation: 75, // 1.25 min — curls, raises, extensions
};

const COMPOUND_IDS = new Set([
  "flat_bench", "incline_bench", "decline_bench", "shoulder_press", "dips",
  "lat_pulldown", "back_pulldown", "t_bar_row", "deadlift",
  "squat", "leg_press",
]);

function restDurationFor(exerciseId) {
  return COMPOUND_IDS.has(exerciseId) ? REST_DEFAULTS.compound : REST_DEFAULTS.isolation;
}

// ---------- STORAGE HELPERS ----------

async function loadHistory() {
  try {
    const raw = localStorage.getItem("reps:history");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveHistory(history) {
  try {
    localStorage.setItem("reps:history", JSON.stringify(history));
  } catch (e) {
    console.error("Save failed", e);
  }
}

function fmtDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ---------- REST TIMER ----------

function RestTimer({ duration, onClose }) {
  const [secondsLeft, setSecondsLeft] = useState(duration);
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current);
          if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const pct = ((duration - secondsLeft) / duration) * 100;
  const done = secondsLeft === 0;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "#1A1B1E",
        borderTop: `1px solid ${done ? "#C8FF4D" : "#2A2B2F"}`,
        padding: "14px 20px 22px",
        zIndex: 50,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <TimerIcon size={16} color={done ? "#C8FF4D" : "#6E7178"} />
          <span style={{ color: done ? "#C8FF4D" : "#F4F2EC", fontSize: 13, letterSpacing: 0.5, textTransform: "uppercase" }}>
            {done ? "Rest done" : "Resting"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontVariantNumeric: "tabular-nums", fontSize: 22, fontWeight: 600, color: "#F4F2EC" }}>
            {mins}:{secs.toString().padStart(2, "0")}
          </span>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#6E7178", padding: 4 }}
            aria-label="Close timer"
          >
            <X size={18} />
          </button>
        </div>
      </div>
      <div style={{ height: 3, background: "#2A2B2F", borderRadius: 2, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: done ? "#C8FF4D" : "#F4F2EC",
            transition: "width 1s linear",
          }}
        />
      </div>
    </div>
  );
}

// ---------- DAY PICKER ----------

function DayPicker({ onSelect }) {
  return (
    <div style={{ padding: "28px 20px" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, color: "#F4F2EC", margin: 0, letterSpacing: -0.5 }}>Reps</h1>
        <p style={{ color: "#6E7178", fontSize: 14, marginTop: 4 }}>Pick today's session</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {Object.entries(DAYS).map(([key, day]) => (
          <button
            key={key}
            onClick={() => onSelect(key)}
            style={{
              background: "#1A1B1E",
              border: "1px solid #2A2B2F",
              borderRadius: 14,
              padding: "24px 20px",
              textAlign: "left",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer",
            }}
          >
            <div>
              <div style={{ color: "#F4F2EC", fontSize: 20, fontWeight: 600 }}>{day.label}</div>
              <div style={{ color: "#6E7178", fontSize: 13, marginTop: 2 }}>{day.exercises.length} exercises</div>
            </div>
            <div style={{ color: "#C8FF4D", fontSize: 22 }}>→</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------- EXERCISE LIST ----------

function ExerciseList({ dayKey, history, onSelectExercise, onBack }) {
  const day = DAYS[dayKey];

  return (
    <div style={{ padding: "20px 20px 40px" }}>
      <button
        onClick={onBack}
        style={{ background: "none", border: "none", color: "#6E7178", display: "flex", alignItems: "center", gap: 4, padding: "8px 0", marginBottom: 12, cursor: "pointer" }}
      >
        <ChevronLeft size={18} />
        <span style={{ fontSize: 14 }}>Days</span>
      </button>
      <h2 style={{ fontSize: 26, fontWeight: 700, color: "#F4F2EC", margin: "0 0 20px" }}>{day.label}</h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {day.exercises.map((ex) => {
          const exHistory = history[ex.id];
          const lastSet = exHistory?.sets?.[exHistory.sets.length - 1];
          return (
            <button
              key={ex.id}
              onClick={() => onSelectExercise(ex)}
              style={{
                background: "#1A1B1E",
                border: "none",
                borderBottom: "1px solid #232427",
                padding: "16px 16px",
                textAlign: "left",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
                width: "100%",
              }}
            >
              <div>
                <div style={{ color: "#F4F2EC", fontSize: 16, fontWeight: 500 }}>{ex.name}</div>
                <div style={{ color: "#6E7178", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, marginTop: 3 }}>
                  {ex.tag}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                {lastSet ? (
                  <div style={{ fontVariantNumeric: "tabular-nums", color: "#9A9CA3", fontSize: 14 }}>
                    {lastSet.weight}kg × {lastSet.reps}
                  </div>
                ) : (
                  <div style={{ color: "#4A4B50", fontSize: 13 }}>—</div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------- LOGGER ----------

function ExerciseLogger({ exercise, history, onLogSet, onBack, onStartRest }) {
  const exHistory = history[exercise.id];
  const pastSets = exHistory?.sets || [];
  const lastSession = pastSets.length > 0 ? pastSets[pastSets.length - 1] : null;

  const [weight, setWeight] = useState(lastSession ? lastSession.weight : "");
  const [reps, setReps] = useState(lastSession ? lastSession.reps : "");

  const adjust = (setter, val, delta, min = 0) => {
    setter(Math.max(min, (parseFloat(val) || 0) + delta));
  };

  const handleLog = () => {
    if (!weight || !reps) return;
    onLogSet(exercise.id, { weight: parseFloat(weight), reps: parseInt(reps), ts: Date.now() });
    onStartRest(restDurationFor(exercise.id));
  };

  const recentSets = [...pastSets].slice(-5).reverse();

  return (
    <div style={{ padding: "20px 20px 140px" }}>
      <button
        onClick={onBack}
        style={{ background: "none", border: "none", color: "#6E7178", display: "flex", alignItems: "center", gap: 4, padding: "8px 0", marginBottom: 8, cursor: "pointer" }}
      >
        <ChevronLeft size={18} />
        <span style={{ fontSize: 14 }}>Back</span>
      </button>

      <div style={{ marginBottom: 4, color: "#6E7178", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6 }}>
        {exercise.tag}
      </div>
      <h2 style={{ fontSize: 24, fontWeight: 700, color: "#F4F2EC", margin: "0 0 24px" }}>{exercise.name}</h2>

      {lastSession && (
        <div style={{ background: "#1A1B1E", borderRadius: 12, padding: "14px 16px", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#6E7178", fontSize: 13 }}>Last time</span>
          <span style={{ fontVariantNumeric: "tabular-nums", color: "#F4F2EC", fontSize: 16, fontWeight: 600 }}>
            {lastSession.weight}kg × {lastSession.reps}
          </span>
        </div>
      )}

      {/* Weight input */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ color: "#6E7178", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>Weight (kg)</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => adjust(setWeight, weight, -2.5)}
            style={{ width: 48, height: 48, borderRadius: 10, background: "#1A1B1E", border: "1px solid #2A2B2F", color: "#F4F2EC", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <Minus size={18} />
          </button>
          <input
            type="number"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            style={{
              flex: 1,
              background: "#1A1B1E",
              border: "1px solid #2A2B2F",
              borderRadius: 10,
              color: "#F4F2EC",
              fontSize: 28,
              fontWeight: 700,
              textAlign: "center",
              padding: "10px 0",
              fontVariantNumeric: "tabular-nums",
            }}
          />
          <button
            onClick={() => adjust(setWeight, weight, 2.5)}
            style={{ width: 48, height: 48, borderRadius: 10, background: "#1A1B1E", border: "1px solid #2A2B2F", color: "#F4F2EC", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* Reps input */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ color: "#6E7178", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>Reps</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => adjust(setReps, reps, -1)}
            style={{ width: 48, height: 48, borderRadius: 10, background: "#1A1B1E", border: "1px solid #2A2B2F", color: "#F4F2EC", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <Minus size={18} />
          </button>
          <input
            type="number"
            inputMode="numeric"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            style={{
              flex: 1,
              background: "#1A1B1E",
              border: "1px solid #2A2B2F",
              borderRadius: 10,
              color: "#F4F2EC",
              fontSize: 28,
              fontWeight: 700,
              textAlign: "center",
              padding: "10px 0",
              fontVariantNumeric: "tabular-nums",
            }}
          />
          <button
            onClick={() => adjust(setReps, reps, 1)}
            style={{ width: 48, height: 48, borderRadius: 10, background: "#1A1B1E", border: "1px solid #2A2B2F", color: "#F4F2EC", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      <button
        onClick={handleLog}
        disabled={!weight || !reps}
        style={{
          width: "100%",
          background: weight && reps ? "#C8FF4D" : "#2A2B2F",
          color: weight && reps ? "#0E0F11" : "#6E7178",
          border: "none",
          borderRadius: 12,
          padding: "16px 0",
          fontSize: 16,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          cursor: weight && reps ? "pointer" : "default",
        }}
      >
        <Check size={20} />
        Log set
      </button>

      {recentSets.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <div style={{ color: "#6E7178", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 10 }}>
            Recent sets
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {recentSets.map((s, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 4px",
                  borderBottom: i < recentSets.length - 1 ? "1px solid #1F2023" : "none",
                }}
              >
                <span style={{ color: "#6E7178", fontSize: 13 }}>{fmtDate(s.ts)}</span>
                <span style={{ fontVariantNumeric: "tabular-nums", color: "#9A9CA3", fontSize: 14 }}>
                  {s.weight}kg × {s.reps}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- ROOT ----------

export default function Reps() {
  const [view, setView] = useState("day"); // day | list | log
  const [dayKey, setDayKey] = useState(null);
  const [exercise, setExercise] = useState(null);
  const [history, setHistory] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [restTimer, setRestTimer] = useState(null); // duration in seconds, or null

  useEffect(() => {
    loadHistory().then((h) => {
      setHistory(h);
      setLoaded(true);
    });
  }, []);

  const handleLogSet = useCallback(
    (exId, set) => {
      setHistory((prev) => {
        const updated = { ...prev };
        const existing = updated[exId]?.sets || [];
        updated[exId] = { sets: [...existing, set] };
        saveHistory(updated);
        return updated;
      });
    },
    []
  );

  if (!loaded) {
    return (
      <div style={{ minHeight: "100vh", background: "#0E0F11", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "#6E7178", fontSize: 14 }}>Loading…</span>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0E0F11", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      {view === "day" && (
        <DayPicker
          onSelect={(key) => {
            setDayKey(key);
            setView("list");
          }}
        />
      )}

      {view === "list" && dayKey && (
        <ExerciseList
          dayKey={dayKey}
          history={history}
          onSelectExercise={(ex) => {
            setExercise(ex);
            setView("log");
          }}
          onBack={() => setView("day")}
        />
      )}

      {view === "log" && exercise && (
        <ExerciseLogger
          exercise={exercise}
          history={history}
          onLogSet={handleLogSet}
          onBack={() => setView("list")}
          onStartRest={(duration) => setRestTimer(duration)}
        />
      )}

      {restTimer !== null && (
        <RestTimer key={restTimer + Date.now()} duration={restTimer} onClose={() => setRestTimer(null)} />
      )}
    </div>
  );
}
