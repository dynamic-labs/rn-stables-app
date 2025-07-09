import React from "react";
import { View } from "react-native";
import { client } from "../client";

export const DynamicProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <View style={{ flex: 1 }}>
      <client.reactNative.WebView />
      {children}
    </View>
  );
};
