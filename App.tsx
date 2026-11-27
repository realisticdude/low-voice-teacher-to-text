import React, { useState } from "react";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { HomeScreen } from "./src/screens/HomeScreen";
import { TeacherScreen } from "./src/screens/TeacherScreen";
import { StudentScreen } from "./src/screens/StudentScreen";
import { colors } from "./src/components/theme";

type Screen = "home" | "teacher" | "student";

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  // Fonts are loaded from the project's own assets folder, not from
  // node_modules: web exports keep an asset's original path, and Netlify's
  // drag-and-drop upload skips any folder named node_modules, which left the
  // live site with no icon font (icons drew as crossed-out boxes).
  // "feather" is the family name @expo/vector-icons' Feather looks for, so
  // registering it here means the icon set never fetches its own copy.
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular: require("./assets/fonts/Inter_400Regular.ttf"),
    Inter_500Medium: require("./assets/fonts/Inter_500Medium.ttf"),
    Inter_600SemiBold: require("./assets/fonts/Inter_600SemiBold.ttf"),
    Inter_700Bold: require("./assets/fonts/Inter_700Bold.ttf"),
    JetBrainsMono_500Medium: require("./assets/fonts/JetBrainsMono_500Medium.ttf"),
    JetBrainsMono_700Bold: require("./assets/fonts/JetBrainsMono_700Bold.ttf"),
    feather: require("./assets/fonts/Feather.ttf"),
  });

  // Hold the first paint until fonts are ready so text doesn't reflow. If
  // loading fails, carry on with system fonts rather than a blank screen.
  if (!fontsLoaded && !fontError) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

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
