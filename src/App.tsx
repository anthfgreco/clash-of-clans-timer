import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";

interface Timer {
  id: number;
  endAtMs: number;
  type: "builder" | "research" | "pet";
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
  const seconds = Math.floor(totalSeconds % 60);
  const parts: string[] = [];
  if (weeks) parts.push(`${weeks}w`);
  if (days || (parts.length > 0 && (hours || minutes || seconds)))
    parts.push(`${days}d`);
  if (hours || (parts.length > 0 && (minutes || seconds)))
    parts.push(`${hours}h`);
  if (minutes || (parts.length > 0 && seconds)) parts.push(`${minutes}m`);
  if (seconds || parts.length === 0) {
    if (parts.length > 0) parts.push(`${seconds.toString().padStart(2, "0")}s`);
    else parts.push(`${seconds}s`);
  }
  return parts.join(" ");
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

const DEFAULT_TITLE = "Clash of Clans Timer App";
const ALARM_SOUND_SRC = "/clash_of_clans.mp3";

export function App() {
  const [timeInput, setTimeInput] = useState<string>("");
  const [timerType, setTimerType] = useState<"builder" | "research" | "pet">(
    "builder",
  );
  const [useBuilderPotion, setUseBuilderPotion] = useState<boolean>(true);
  const [useResearchPotion, setUseResearchPotion] = useState<boolean>(true);
  const [usePetPotion, setUsePetPotion] = useState<boolean>(true);
  const [timers, setTimers] = useState<Timer[]>([]);
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission | null>(null);
  const [isAlarmPlaying, setIsAlarmPlaying] = useState<boolean>(false);

  const [nowMs, setNowMs] = useState<number>(Date.now());

  const alarmSoundRef = useRef<HTMLAudioElement | null>(null);

  // Initialize Audio and Notifications
  useEffect(() => {
    if (typeof window !== "undefined") {
      if ("Notification" in window) {
        setNotificationPermission(Notification.permission);
      } else {
        console.warn("Browser does not support Notifications.");
      }

      // Audio
      alarmSoundRef.current = new Audio(ALARM_SOUND_SRC);
      alarmSoundRef.current.load();
    }
  }, []);

  // Visual tick (1s).
  // Can be slower for less renders.
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const handleStopAlarm = useCallback(() => {
    if (isAlarmPlaying && alarmSoundRef.current) {
      alarmSoundRef.current.pause();
      alarmSoundRef.current.currentTime = 0;
      setIsAlarmPlaying(false);
      console.log("Alarm stopped.");
    }
  }, [isAlarmPlaying]);

  // Global click listener to stop alarm
  useEffect(() => {
    const clickListener = () => {
      if (isAlarmPlaying) handleStopAlarm();
    };
    document.addEventListener("click", clickListener);
    console.log("Global click listener added.");
    return () => {
      document.removeEventListener("click", clickListener);
      console.log("Global click listener removed.");
    };
  }, [isAlarmPlaying, handleStopAlarm]);

  const getPotionMultiplier = useCallback(
    (type: "builder" | "research" | "pet"): number => {
      if (type === "builder") return useBuilderPotion ? 10 : 1;
      if (type === "research") return useResearchPotion ? 24 : 1;
      if (type === "pet") return usePetPotion ? 24 : 1;
      return 1;
    },
    [useBuilderPotion, useResearchPotion, usePetPotion],
  );

  // Fire alarms for due timers (endAtMs <= nowMs) and remove them.
  useEffect(() => {
    if (timers.length === 0) return;

    const due = timers.filter((t) => t.endAtMs <= nowMs);
    if (due.length === 0) return;

    // Alarm
    if (alarmSoundRef.current) {
      alarmSoundRef.current.pause();
      alarmSoundRef.current.currentTime = 0;
      alarmSoundRef.current
        .play()
        .then(() => {
          setIsAlarmPlaying(true);
          console.log("Alarm playing...");
        })
        .catch((error) => {
          console.error("Error playing sound:", error);
          setIsAlarmPlaying(false);
        });
    }

    // Notification
    if (notificationPermission === "granted") {
      const finishedTypes = Array.from(new Set(due.map((d) => d.type))).join(
        ", ",
      );
      new Notification("Clash Timer Done!", {
        body: `Your ${finishedTypes} timer(s) finished!`,
        tag: "clash-timer-done",
      });
    }

    // Remove due timers
    setTimers((prev) => prev.filter((t) => t.endAtMs > nowMs));
  }, [nowMs, timers, notificationPermission]);

  // Update document title with the soonest REAL-TIME remaining timer
  useEffect(() => {
    if (timers.length === 0) {
      document.title = isAlarmPlaying ? "!! DONE !!" : DEFAULT_TITLE;
      return;
    }

    const soonestEndMs = Math.min(...timers.map((t) => t.endAtMs));
    const soonestRemainingSeconds = Math.max(
      0,
      Math.ceil((soonestEndMs - nowMs) / 1000),
    );

    if (isFinite(soonestRemainingSeconds)) {
      document.title = `${formatMMSS(soonestRemainingSeconds)} - CoC Timer`;
    } else {
      document.title = isAlarmPlaying ? "!! DONE !!" : DEFAULT_TITLE;
    }
  }, [timers, nowMs, isAlarmPlaying]);

  const handleAddTimer = () => {
    const durationInSeconds = parseTimeInput(timeInput);
    if (durationInSeconds > 0) {
      // Warm up audio so autoplay is allowed later
      if (alarmSoundRef.current?.paused && !isAlarmPlaying) {
        alarmSoundRef.current
          .play()
          .then(() => {
            alarmSoundRef.current?.pause();
            if (alarmSoundRef.current) alarmSoundRef.current.currentTime = 0;
          })
          .catch(() => {
            /* ignore */
          });
      }

      handleStopAlarm();

      const multiplier = getPotionMultiplier(timerType);
      const realDurationMs = (durationInSeconds / multiplier) * 1000;

      const newTimer: Timer = {
        id: Date.now(),
        endAtMs: Date.now() + realDurationMs,
        type: timerType,
      };

      setTimers((prev) => [...prev, newTimer]);
      setTimeInput("");
    }
  };

  const handleRemoveTimer = (id: number) => {
    setTimers((prev) => prev.filter((t) => t.id !== id));
  };

  const requestNotifications = () => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then((permission) => {
        setNotificationPermission(permission);
      });
    } else if (Notification.permission === "denied") {
      alert(
        "Notification permission was denied. Please enable it in your browser settings for this site.",
      );
    } else if (Notification.permission === "granted") {
      alert("Notifications are already enabled!");
    }
  };

  return (
    <div>
      {isAlarmPlaying && (
        <div
          style={{
            position: "fixed",
            top: "10px",
            right: "10px",
            padding: "5px 10px",
            backgroundColor: "rgba(255, 0, 0, 0.7)",
            color: "white",
            borderRadius: "5px",
            zIndex: 1000,
            cursor: "pointer",
          }}
          onClick={handleStopAlarm}
        >
          ALARM ACTIVE (Click anywhere to stop)
        </div>
      )}

      <h1>Clash of Clans Timer App</h1>

      {notificationPermission !== "granted" && (
        <div
          style={{
            marginBottom: "10px",
            padding: "5px",
            border: "1px solid #ccc",
          }}
        >
          {notificationPermission === "default" && (
            <>
              <span>Notifications are helpful for background timers.</span>
              <button
                onClick={requestNotifications}
                style={{ marginLeft: "10px" }}
              >
                Enable Notifications
              </button>
            </>
          )}
          {notificationPermission === "denied" && (
            <span style={{ color: "orange" }}>
              Notifications are disabled in browser settings. You won't get
              alerts in other tabs.
            </span>
          )}
        </div>
      )}

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
        <label>
          <input
            type="checkbox"
            checked={usePetPotion}
            onChange={(e) => setUsePetPotion(e.target.checked)}
          />
          Use Pet Potion (24x speed)
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
        <label>
          <input
            type="radio"
            name="timerType"
            value="pet"
            checked={timerType === "pet"}
            onChange={() => setTimerType("pet")}
          />
          Pet Timer
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
            style={{ fontSize: "16px" }}
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
          const realSecondsRemaining = Math.max(
            0,
            Math.ceil((timer.endAtMs - nowMs) / 1000),
          );
          const gameSecondsRemaining = realSecondsRemaining * multiplier;

          return (
            <li key={timer.id}>
              [{timer.type}] {formatTime(gameSecondsRemaining)}
              {multiplier > 1 && ` (real: ${formatTime(realSecondsRemaining)})`}
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
                  marginLeft: "5px",
                }}
                title="Remove Timer"
              >
                ×
              </button>
            </li>
          );
        })}
      </ul>

      <br />

      {timers.length > 0 && (
        <button
          onClick={() => {
            setTimers([]);
            handleStopAlarm();
          }}
          style={{
            width: "200px",
            padding: "2px",
          }}
        >
          Reset Timers
        </button>
      )}
    </div>
  );
}
