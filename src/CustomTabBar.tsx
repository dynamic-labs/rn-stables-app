import React from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
  Dimensions,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

const TAB_ICONS = [
  { name: "home", label: "Home" },
  { name: "send", label: "Send" },
  { name: "cash-plus", label: "Request" },
  { name: "account-circle-outline", label: "Profile" },
];

const BAR_HEIGHT = 80;

const CustomTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        {state.routes.map((route, idx) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === idx;
          const icon = TAB_ICONS[idx]?.name || "circle";
          const label = TAB_ICONS[idx]?.label || route.name;
          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
              style={styles.tab}
              activeOpacity={0.8}
            >
              <Icon
                name={icon}
                size={28}
                color={isFocused ? "#4779FF" : "#A1A1AA"}
              />
              <Text style={[styles.label, isFocused && { color: "#4779FF" }]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: BAR_HEIGHT,
    alignItems: "center",
    justifyContent: "flex-end",
    backgroundColor: "#EEEFF1",
    borderTopWidth: 1,
    borderTopColor: "#E7E8ED",
    shadowColor: "#6D79A5",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 8,
  },
  tabRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    width: "100%",
    height: BAR_HEIGHT,
    paddingHorizontal: 30,
    paddingBottom: Platform.OS === "ios" ? 10 : 6,
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  label: {
    fontSize: 13,
    color: "#A1A1AA",
    marginTop: 2,
    fontWeight: "500",
  },
});

export default CustomTabBar;
