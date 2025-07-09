import React from "react";
import { View, Text, StyleSheet, ViewStyle, TextStyle } from "react-native";

interface InitialsAvatarProps {
  name: string;
  size?: number;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

function getInitials(name: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || "?";
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const InitialsAvatar: React.FC<InitialsAvatarProps> = ({
  name,
  size = 40,
  style,
  textStyle,
}) => {
  const initials = getInitials(name);
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    >
      <Text style={[styles.initials, { fontSize: size * 0.45 }, textStyle]}>
        {initials}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: "#e0e4ea",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#3777F3",
  },
  initials: {
    color: "#444",
    fontWeight: "bold",
  },
});

export default InitialsAvatar;
