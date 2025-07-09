import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import AppNavigator from "./src/navigation/AppNavigator";
import { DynamicProvider } from "./src/lib/DynamicProvider";
import { navigationRef } from "./src/navigation/RootNavigation";

export default function App() {
  return (
    <NavigationContainer ref={navigationRef}>
      <DynamicProvider>
        <AppNavigator />
      </DynamicProvider>
    </NavigationContainer>
  );
}
