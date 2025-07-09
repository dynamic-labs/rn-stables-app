import React from "react";
import { View, Image, Text, StyleSheet, Dimensions } from "react-native";
import LogoText from "../assets/images/logo-text.svg";

const { width, height } = Dimensions.get("window");

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      {/* Dotted background */}
      <Image
        source={require("../assets/images/dotted-bg.png")}
        style={styles.background}
        resizeMode="cover"
      />

      {/* Centered logo with shadow */}
      <Image
        source={require("../assets/images/splash-logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />

      {/* App name and logo at the bottom */}
      <View style={styles.bottomContainer}>
        <LogoText width={120} height={32} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  background: {
    ...StyleSheet.absoluteFillObject,
    width,
    height,
    opacity: 0.2,
  },
  logo: {
    width: width * 1.2,
    height: height * 1.2,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  bottomContainer: {
    position: "absolute",
    bottom: 40,
    flexDirection: "row",
    alignItems: "center",
  },
  bottomLogo: {
    width: 32,
    height: 32,
    marginRight: 8,
  },
});
