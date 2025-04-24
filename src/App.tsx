import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";

interface Timer {
  id: number;
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

  if (days || (parts.length > 0 && (hours || minutes || seconds)))
    parts.push(`${days}d`);

  if (hours || (parts.length > 0 && (minutes || seconds)))
    parts.push(`${hours}h`);

  if (minutes || (parts.length > 0 && seconds)) parts.push(`${minutes}m`);

  if (seconds || parts.length === 0) {
    if (parts.length > 0) {
      parts.push(`${seconds.toString().padStart(2, "0")}s`);
    } else {
      parts.push(`${seconds}s`);
    }
  }

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

const DEFAULT_TITLE = "Clash of Clans Timer App";
const ALARM_SOUND_SRC = "/clash_of_clans.mp3";

function App() {
  const [timeInput, setTimeInput] = useState<string>("");
  const [timerType, setTimerType] = useState<"builder" | "research">("builder");
  const [useBuilderPotion, setUseBuilderPotion] = useState<boolean>(true);
  const [useResearchPotion, setUseResearchPotion] = useState<boolean>(true);
  const [timers, setTimers] = useState<Timer[]>([]);
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission | null>(null);
  const [isAlarmPlaying, setIsAlarmPlaying] = useState<boolean>(false);

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

  const handleStopAlarm = useCallback(() => {
    if (isAlarmPlaying && alarmSoundRef.current) {
      alarmSoundRef.current.pause();
      alarmSoundRef.current.currentTime = 0;
      setIsAlarmPlaying(false);
      console.log("Alarm stopped."); // Optional: for debugging
    }
  }, [isAlarmPlaying]);

  // Handle global click listener to stop alarm
  useEffect(() => {
    // Define the handler for the listener
    const clickListener = () => {
      if (isAlarmPlaying) {
        handleStopAlarm();
      }
    };

    // Add the listener to the document
    document.addEventListener("click", clickListener);
    console.log("Global click listener added.");

    return () => {
      document.removeEventListener("click", clickListener);
      console.log("Global click listener removed.");
    };
  }, [isAlarmPlaying, handleStopAlarm]);

  const getPotionMultiplier = (type: "builder" | "research") => {
    if (type === "builder") return useBuilderPotion ? 10 : 1;
    if (type === "research") return useResearchPotion ? 24 : 1;
    return 1;
  };

  // Timer tick effect
  useEffect(() => {
    const interval = setInterval(() => {
      let timerFinishedThisTick = false;
      const finishedTimerTypes: Set<string> = new Set();

      setTimers((prevTimers) => {
        const updatedTimers = prevTimers.map((timer) => {
          const multiplier = getPotionMultiplier(timer.type);
          const decrement = 1 * multiplier;
          const newRemaining = timer.remaining - decrement;

          if (timer.remaining > 0 && newRemaining <= 0) {
            timerFinishedThisTick = true;
            finishedTimerTypes.add(timer.type);
          }

          return { ...timer, remaining: newRemaining > 0 ? newRemaining : 0 };
        });

        const activeTimers = updatedTimers.filter(
          (timer) => timer.remaining > 0,
        );

        // Play soud and show notification
        if (timerFinishedThisTick) {
          // Start alarm
          if (alarmSoundRef.current) {
            // Ensure previous alarm is stopped
            alarmSoundRef.current.pause();
            alarmSoundRef.current.currentTime = 0;
            // Play the sound
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
            const finishedTypesString =
              Array.from(finishedTimerTypes).join(", ");
            const notificationTitle = "Clash Timer Done!";
            const notificationBody = `Your ${finishedTypesString} timer(s) finished!`;
            new Notification(notificationTitle, {
              body: notificationBody,
              tag: "clash-timer-done",
            });
          }
        }

        // Update document title
        let minAdjustedSeconds = Infinity;
        for (const t of activeTimers) {
          const adjusted = t.remaining / getPotionMultiplier(t.type);
          if (adjusted < minAdjustedSeconds) {
            minAdjustedSeconds = adjusted;
          }
        }

        if (activeTimers.length > 0 && isFinite(minAdjustedSeconds)) {
          document.title = formatMMSS(Math.ceil(minAdjustedSeconds));
        } else {
          if (!isAlarmPlaying) {
            document.title = DEFAULT_TITLE;
          } else {
            document.title = "!! DONE !!";
          }
        }

        return activeTimers;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [
    useBuilderPotion,
    useResearchPotion,
    notificationPermission,
    isAlarmPlaying,
  ]);

  const handleAddTimer = () => {
    const duration = parseTimeInput(timeInput);
    if (duration > 0) {
      if (alarmSoundRef.current?.paused && !isAlarmPlaying) {
        // Check if not already playing alarm
        alarmSoundRef.current
          .play()
          .then(() => {
            alarmSoundRef.current?.pause();
            if (alarmSoundRef.current) {
              alarmSoundRef.current.currentTime = 0;
            }
          })
          .catch(() => {
            /* Ignore error */
          });
      }

      handleStopAlarm();

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
            style={{
              fontSize: "16px",
            }}
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
          const adjustedSeconds = Math.max(0, timer.remaining / multiplier);
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

export default App;
