import { useEffect, useState } from "react";
import "./App.css";

interface Timer {
  id: number;
  /** In seconds. */
  remaining: number;
  type: "builder" | "research";
}

function parseTimeInput(input: string): number {
  const regex = /(?:(\d+)w)?(?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/i;
  const matches = input.match(regex);
  if (!matches) return 0;

  const weeks = parseInt(matches[1] || "0", 10);
  const days = parseInt(matches[2] || "0", 10);
  const hours = parseInt(matches[3] || "0", 10);
  const minutes = parseInt(matches[4] || "0", 10);
  const seconds = parseInt(matches[5] || "0", 10);

  return (
    weeks * 7 * 86400 + days * 86400 + hours * 3600 + minutes * 60 + seconds
  );
}

function formatTime(totalSeconds: number): string {
  const weeks = Math.floor(totalSeconds / (7 * 86400));
  const days = Math.floor((totalSeconds % (7 * 86400)) / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (weeks) parts.push(`${weeks}w`);
  if (days || parts.length > 0) parts.push(`${days}d`);
  if (hours || parts.length > 0) parts.push(`${hours}h`);
  if (minutes || parts.length > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds.toString().padStart(2, "0")}s`);

  return parts.join(" ");
}

function getSecondLargestTimeUnit(seconds: number): string {
  const timeUnits = [
    { label: "w", value: 604800 },
    { label: "d", value: 86400 },
    { label: "h", value: 3600 },
    { label: "m", value: 60 },
  ];

  const activeUnits = timeUnits.filter(
    (unit) => Math.floor(seconds / unit.value) > 0,
  );

  if (activeUnits.length === 0) return "<1m";
  const second = activeUnits.length > 1 ? activeUnits[1] : activeUnits[0];
  const amount = Math.floor(seconds / second.value);
  return `${amount}${second.label}`;
}

function formatMMSS(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

function App() {
  const [timeInput, setTimeInput] = useState<string>("");
  const [timerType, setTimerType] = useState<"builder" | "research">("builder");
  const [useBuilderPotion, setUseBuilderPotion] = useState<boolean>(true);
  const [useResearchPotion, setUseResearchPotion] = useState<boolean>(true);
  const [timers, setTimers] = useState<Timer[]>([]);

  const getPotionMultiplier = (type: "builder" | "research") => {
    if (type === "builder") return useBuilderPotion ? 10 : 1;
    if (type === "research") return useResearchPotion ? 24 : 1;
    return 1;
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setTimers((prevTimers) => {
        const updated = prevTimers
          .map((timer) => {
            const multiplier = getPotionMultiplier(timer.type);
            const newRemaining = timer.remaining - 1 * multiplier;
            return { ...timer, remaining: newRemaining > 0 ? newRemaining : 0 };
          })
          .filter((timer) => timer.remaining > 0);

        // Update document title with smallest timer AFTER potion adjustment
        let minAdjustedSeconds = Infinity;
        for (const t of updated) {
          const adjusted = t.remaining / getPotionMultiplier(t.type);
          if (adjusted < minAdjustedSeconds) {
            minAdjustedSeconds = adjusted;
          }
        }

        if (isFinite(minAdjustedSeconds)) {
          document.title = formatMMSS(Math.ceil(minAdjustedSeconds));
        } else {
          document.title = "Clash of Clans Timer App";
        }

        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [useBuilderPotion, useResearchPotion]);

  const handleAddTimer = () => {
    const duration = parseTimeInput(timeInput);

    if (duration > 0) {
      const newTimer: Timer = {
        id: Date.now(),
        remaining: duration,
        type: timerType,
      };

      setTimers((prevTimers) => [...prevTimers, newTimer]);
      setTimeInput("");
    }
  };

  const handleRemoveTimer = (id: number) => {
    setTimers((prevTimers) => prevTimers.filter((t) => t.id !== id));
  };

  return (
    <div>
      <h1>Clash of Clans Timer App</h1>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1px",
          alignItems: "center",
        }}
      >
        <label>
          <input
            type="checkbox"
            checked={useBuilderPotion}
            onChange={(e) => setUseBuilderPotion(e.target.checked)}
          />
          Use Builder Potion (10x speed)
        </label>
        <label>
          <input
            type="checkbox"
            checked={useResearchPotion}
            onChange={(e) => setUseResearchPotion(e.target.checked)}
          />
          Use Research Potion (24x speed)
        </label>
      </div>

      <br />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1px",
          alignItems: "center",
        }}
      >
        <label>
          <input
            type="radio"
            name="timerType"
            value="builder"
            checked={timerType === "builder"}
            onChange={() => setTimerType("builder")}
          />
          Builder Timer
        </label>
        <label>
          <input
            type="radio"
            name="timerType"
            value="research"
            checked={timerType === "research"}
            onChange={() => setTimerType("research")}
          />
          Research Timer
        </label>
      </div>

      <br />

      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: "10px",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <label
          style={{
            display: "flex",
            flexDirection: "row",
            gap: "5px",
          }}
        >
          Time Input:
          <input
            type="text"
            value={timeInput}
            onChange={(e) => setTimeInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddTimer();
            }}
            placeholder="1h30m20s / 1w2d3h"
          />
        </label>

        <button
          onClick={handleAddTimer}
          style={{
            width: "50px",
            padding: "2px",
          }}
        >
          Add
        </button>
      </div>

      <h2 style={{ margin: "10px" }}>Timers</h2>

      <ul
        style={{
          listStyleType: "none",
          padding: 0,
          margin: 0,
        }}
      >
        {timers.map((timer) => {
          const multiplier = getPotionMultiplier(timer.type);
          const adjustedSeconds = timer.remaining / multiplier;
          const label = getSecondLargestTimeUnit(adjustedSeconds);

          return (
            <li key={timer.id}>
              [{timer.type}] {formatTime(Math.ceil(timer.remaining))}
              {multiplier > 1 && ` (${label})`}
              <button
                onClick={() => handleRemoveTimer(timer.id)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "red",
                  fontWeight: "bold",
                  fontSize: "20px",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                ×
              </button>
            </li>
          );
        })}
      </ul>

      <br />

      <button
        onClick={() => setTimers([])}
        style={{
          width: "200px",
          padding: "2px",
        }}
      >
        Reset Timers
      </button>
    </div>
  );
}

export default App;
