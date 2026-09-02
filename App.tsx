import React, { useState } from "react";
import { HomeScreen } from "./src/screens/HomeScreen";
import { TeacherScreen } from "./src/screens/TeacherScreen";
import { StudentScreen } from "./src/screens/StudentScreen";

type Screen = "home" | "teacher" | "student";

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");

  if (screen === "teacher") {
    return <TeacherScreen onExit={() => setScreen("home")} />;
  }
  if (screen === "student") {
    return <StudentScreen onExit={() => setScreen("home")} />;
  }
  return <HomeScreen onSelectRole={setScreen} />;
}
