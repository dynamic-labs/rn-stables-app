import { CommonActions, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { FC, useEffect } from "react";
import {
  Button,
  Dimensions,
  PixelRatio,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
} from "react-native";
import { client } from "../client";
import LogoText from "../assets/images/logo-text.svg";

export type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  MainApp: { screen?: string; params?: any }; // <-- Add this line
};

export type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Screen scaling utilities
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const DESIGN_WIDTH = 375;
const DESIGN_HEIGHT = 812;
const horizontalScaleFactor = SCREEN_WIDTH / DESIGN_WIDTH;
const verticalScaleFactor = SCREEN_HEIGHT / DESIGN_HEIGHT;

const scaledFont = (size: number) =>
  PixelRatio.roundToNearestPixel(size * horizontalScaleFactor);
const scaledWidth = (width: number) =>
  PixelRatio.roundToNearestPixel(width * horizontalScaleFactor);
const scaledHeight = (height: number) =>
  PixelRatio.roundToNearestPixel(height * verticalScaleFactor);

export const LoginView: FC = () => {
  const navigation = useNavigation<NavigationProp>();

  useEffect(() => {
    // Check if user is already signed in
    const checkAuth = async () => {
      try {
        const p = client.wallets.primary;
        if (p) {
          // If authenticated, navigate to the main app screen
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: "Home" }],
            })
          );
        }
      } catch (error) {
        console.error("Auth check failed:", error);
      }
    };

    checkAuth();
  }, [navigation]);

  return (
    <View style={styles.container}>
      {/* Dotted background */}
      <Image
        source={require("../assets/images/dotted-bg.png")}
        style={styles.background}
        resizeMode="cover"
      />
      {/* Centered logo */}
      <Image
        source={require("../assets/images/splash-logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      {/* Content below logo */}
      <View style={styles.content}>
        <Text style={styles.title}>Welcome</Text>
        <Text style={styles.subtitle}>Sign in to access your account</Text>
        <TouchableOpacity
          style={styles.signInButton}
          onPress={() => client.ui.auth.show()}
        >
          <Text style={styles.signInButtonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
      {/* Bottom logo text */}
      <View style={styles.bottomContainer}>
        <LogoText width={120} height={32} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fafbfc",
    justifyContent: "center",
    alignItems: "center",
    padding: scaledWidth(20),
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    opacity: 0.2,
  },
  logo: {
    width: SCREEN_WIDTH * 0.35,
    height: SCREEN_WIDTH * 0.35,
    marginTop: scaledHeight(80),
    marginBottom: scaledHeight(32),
    alignSelf: "center",
  },
  content: {
    width: "100%",
    maxWidth: scaledWidth(340),
    alignItems: "center",
    gap: scaledHeight(20),
    padding: 0,
    marginTop: 0,
    marginBottom: scaledHeight(32),
  },
  title: {
    fontSize: scaledFont(32),
    fontWeight: "bold",
    color: "#222",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: scaledFont(16),
    color: "#888",
    textAlign: "center",
    marginBottom: scaledHeight(24),
  },
  signInButton: {
    backgroundColor: "#4F7CFE",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: "center",
    width: "90%",
    maxWidth: 320,
    marginTop: scaledHeight(16),
    marginBottom: scaledHeight(24),
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  signInButtonText: {
    color: "#fff",
    fontSize: scaledFont(18),
    fontWeight: "bold",
  },
  bottomContainer: {
    position: "absolute",
    bottom: 32,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    marginTop: scaledHeight(32),
  },
});
