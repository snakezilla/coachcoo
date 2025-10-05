import { useRive, Layout, Fit, Alignment } from "rive-react";
import avatarFile from "./CoachCooAvatar.riv";

export default function App() {
  const { RiveComponent } = useRive({
    src: avatarFile,
    autoplay: true,
    stateMachines: "AvatarMachine",
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
  });

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f172a",
      }}
    >
      <div style={{ width: 420, height: 420, background: "#16213d", borderRadius: 32 }}>
        <RiveComponent />
      </div>
    </div>
  );
}
