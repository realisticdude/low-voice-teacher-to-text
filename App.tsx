import React, { useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { HomeScreen } from "./src/screens/HomeScreen";
import { TeacherScreen } from "./src/screens/TeacherScreen";
import { StudentScreen } from "./src/screens/StudentScreen";

type Screen = "home" | "teacher" | "student";

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");

  let content: React.ReactNode;
  if (screen === "teacher") {
    content = <TeacherScreen onExit={() => setScreen("home")} />;
  } else if (screen === "student") {
    content = <StudentScreen onExit={() => setScreen("home")} />;
  } else {
    content = <HomeScreen onSelectRole={setScreen} />;
  }

  // Android draws edge-to-edge, so screens need real insets from this
  // provider rather than React Native's iOS-only SafeAreaView.
  return <SafeAreaProvider>{content}</SafeAreaProvider>;
}
