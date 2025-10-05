import { useEffect, useMemo, useState } from "react";
import { useRive, useStateMachineInput, Layout, Fit, Alignment } from "rive-react";
import avatarFile from "./CoachCooAvatar.riv";

export default function App() {
  const [availableMachines, setAvailableMachines] = useState([]);
  const [selectedMachine, setSelectedMachine] = useState("");
  const [inputsMeta, setInputsMeta] = useState([]);
  const [animations, setAnimations] = useState([]);

  const { rive, RiveComponent } = useRive({
    src: avatarFile,
    autoplay: true,
    layout: useMemo(() => new Layout({ fit: Fit.Contain, alignment: Alignment.Center }), []),
  });

  useEffect(() => {
    if (!rive) return;
    const machines = rive.stateMachineNames ?? [];
    setAvailableMachines(machines);
    if (!selectedMachine && machines.length) setSelectedMachine(machines[0]);
    setAnimations(rive.animationNames ?? []);
  }, [rive, selectedMachine]);

  useEffect(() => {
    if (!rive || !selectedMachine) {
      setInputsMeta([]);
      return;
    }
    const raw = rive.stateMachineInputs(selectedMachine) ?? [];
    setInputsMeta(
      raw.map((input) => {
        if (typeof input.fire === "function") return { name: input.name, type: "trigger" };
        if (typeof input.value === "boolean") return { name: input.name, type: "boolean" };
        return { name: input.name, type: "number" };
      })
    );

    try {
      rive.playStateMachine?.(selectedMachine);
    } catch (error) {
      console.warn("Unable to play state machine", error);
    }
  }, [rive, selectedMachine]);

  useEffect(() => {
    if (!rive || animations.length === 0) return;
    try {
      rive.play(animations);
    } catch (error) {
      console.warn("Unable to play animations", error);
    }
  }, [rive, animations]);

  const playAnimation = (name) => {
    if (!rive) return;
    try {
      rive.play(name);
    } catch (error) {
      console.warn(`Unable to play animation ${name}`, error);
    }
  };

  return (
    <div style={rootStyle}>
      <div style={canvasWrapStyle}>
        <RiveComponent style={{ width: "100%", height: "100%" }} />
      </div>

      <section style={panelStyle}>
        <h2 style={titleStyle}>Rive Controls</h2>

        <ControlGroup title="State Machine">
          {availableMachines.length === 0 ? (
            <p style={{ margin: 0, opacity: 0.7 }}>No state machines detected</p>
          ) : (
            <select
              value={selectedMachine}
              onChange={(event) => setSelectedMachine(event.target.value)}
              style={selectStyle}
            >
              {availableMachines.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          )}
        </ControlGroup>

        {animations.length > 0 && (
          <ControlGroup title="Animations">
            {animations.map((name) => (
              <button key={name} style={buttonStyle} onClick={() => playAnimation(name)}>
                Play {name}
              </button>
            ))}
          </ControlGroup>
        )}

        <ControlGroup title="Inputs">
          {inputsMeta.length === 0 && (
            <p style={{ margin: 0, opacity: 0.7 }}>No inputs exposed on this machine.</p>
          )}
          {inputsMeta.map((input) => (
            <InputControl
              key={input.name}
              rive={rive}
              machine={selectedMachine}
              input={input}
            />
          ))}
        </ControlGroup>
      </section>
    </div>
  );
}

function InputControl({ rive, machine, input }) {
  const handle = useStateMachineInput(rive, machine, input.name);
  const [local, setLocal] = useState(() => handle?.value ?? 0);
  const [range, setRange] = useState(1);

  useEffect(() => {
    if (handle && input.type !== "trigger") {
      setLocal(handle.value ?? 0);
      const magnitude = Math.abs(handle.value ?? 1);
      setRange(Math.max(1, magnitude === 0 ? 1 : magnitude * 2));
    }
  }, [handle, input.type]);

  if (!handle) return null;

  if (input.type === "trigger") {
    return (
      <button style={buttonStyle} onClick={() => handle.fire?.()}>
        Fire {input.name}
      </button>
    );
  }

  if (input.type === "boolean") {
    return (
      <button
        style={buttonStyle}
        onClick={() => {
          handle.value = !handle.value;
          setLocal(handle.value);
        }}
      >
        {input.name}: {handle.value ? "On" : "Off"}
      </button>
    );
  }

  return (
    <label style={sliderWrapStyle}>
      <span>
        {input.name}: {Number(local).toFixed(2)}
      </span>
      <input
        type="range"
        min={-range}
        max={range}
        step={0.01}
        value={local}
        onChange={(event) => {
          const value = parseFloat(event.target.value);
          handle.value = value;
          setLocal(value);
        }}
      />
    </label>
  );
}

const ControlGroup = ({ title, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    <h3 style={subtitleStyle}>{title}</h3>
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
  </div>
);

const rootStyle = {
  width: "100vw",
  height: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 32,
  background: "#0f172a",
  color: "white",
  fontFamily: "system-ui",
  padding: 24,
  boxSizing: "border-box",
};

const canvasWrapStyle = {
  width: 420,
  height: 420,
  background: "#16213d",
  borderRadius: 32,
  overflow: "hidden",
  border: "1px solid rgba(255,255,255,0.1)",
};

const panelStyle = { display: "flex", flexDirection: "column", gap: 20, width: 320 };
const titleStyle = { margin: 0, fontSize: 22 };
const subtitleStyle = { margin: 0, fontSize: 16 };
const buttonStyle = {
  padding: "10px 14px",
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
};
const selectStyle = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.2)",
  background: "#1f2b4d",
  color: "white",
};
const sliderWrapStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};
