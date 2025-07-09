import { useReactiveClient } from "@dynamic-labs/react-hooks";
import { Button } from "@rneui/themed";
import React, { useState, useEffect } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { client } from "../client";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../lib/supabase";
import { uploadImage } from "../utils/uploadImage";
import InitialsAvatar from "../components/InitialsAvatar";

const ProfileScreen = () => {
  const { wallets, auth } = useReactiveClient(client);
  const [uploading, setUploading] = useState(false);
  const [profileUrl, setProfileUrl] = useState<string | null>(null);

  // Fetch user profile picture URL
  useEffect(() => {
    const fetchProfile = async () => {
      const email = auth.authenticatedUser?.email;
      if (!email) return;
      const { data, error } = await supabase
        .from("users")
        .select("profile_picture_url")
        .eq("email", email)
        .single();
      if (!error && data?.profile_picture_url) {
        setProfileUrl(data.profile_picture_url);
      }
    };
    fetchProfile();
  }, [auth.authenticatedUser]);

  const handleShowFunding = () => {
    client.ui.fundingOptions.show();
  };

  const handleLogout = async () => {
    try {
      await client.auth.logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Pick and upload image
  const handlePickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      alert("Permission to access camera roll is required!");
      return;
    }
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (pickerResult.canceled) return;
    const asset = pickerResult.assets[0];
    if (!asset.uri) return;
    setUploading(true);
    try {
      const userId = auth.authenticatedUser?.lastVerifiedCredentialId;
      if (!userId) throw new Error("No user ID");
      const { url, error } = await uploadImage(asset.uri, userId);
      if (error) throw error;

      // Update user profile
      const { error: updateError } = await supabase
        .from("users")
        .update({ profile_picture_url: url })
        .eq("id", userId);
      if (updateError) throw updateError;
      setProfileUrl(url);
    } catch (e) {
      alert("Failed to upload image");
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#FAFAFC" }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Header */}
        <View style={styles.headerContainerCustom}>
          <Text style={styles.profileTitle}>Profile</Text>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarBorder}>
              {profileUrl ? (
                <Image
                  source={{ uri: profileUrl }}
                  style={styles.avatarImage}
                />
              ) : (
                <InitialsAvatar
                  name={
                    auth.authenticatedUser?.firstName ||
                    auth.authenticatedUser?.email ||
                    ""
                  }
                  size={74}
                />
              )}
              <TouchableOpacity
                style={styles.cameraIconWrapper}
                onPress={handlePickImage}
                disabled={uploading}
              >
                <Icon name="camera" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.walletName}>
            {auth.authenticatedUser?.firstName}'s wallet
          </Text>
        </View>

        {/* Security Settings */}
        <View style={styles.sectionCustom}>
          <Text style={styles.sectionLabel}>Security Settings</Text>
          <TouchableOpacity
            style={styles.cardButton}
            onPress={handleShowFunding}
          >
            <Icon
              name="credit-card-outline"
              size={24}
              color="#22223A"
              style={{ marginRight: 12 }}
            />
            <Text style={styles.cardButtonText}>Add Debit Card</Text>
            <Icon
              name="chevron-right"
              size={24}
              color="#B0B0B0"
              style={{ marginLeft: "auto" }}
            />
          </TouchableOpacity>
        </View>

        {/* Settings */}
        <View style={styles.sectionCustom}>
          <Text style={styles.sectionLabel}>Settings</Text>
          <TouchableOpacity style={styles.menuItemCustom}>
            <Icon name="currency-usd" size={24} color="#666" />
            <Text style={styles.menuItemTextCustom}>Currency</Text>
            <Icon
              name="chevron-right"
              size={24}
              color="#B0B0B0"
              style={{ marginLeft: "auto" }}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItemCustom}>
            <Icon name="bell-outline" size={24} color="#666" />
            <Text style={styles.menuItemTextCustom}>Notifications</Text>
            <Icon
              name="chevron-right"
              size={24}
              color="#B0B0B0"
              style={{ marginLeft: "auto" }}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItemCustom}>
            <Icon name="shield-outline" size={24} color="#666" />
            <Text style={styles.menuItemTextCustom}>Security</Text>
            <Icon
              name="chevron-right"
              size={24}
              color="#B0B0B0"
              style={{ marginLeft: "auto" }}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItemCustom}>
            <Icon name="help-circle-outline" size={24} color="#666" />
            <Text style={styles.menuItemTextCustom}>Help & Support</Text>
            <Icon
              name="chevron-right"
              size={24}
              color="#B0B0B0"
              style={{ marginLeft: "auto" }}
            />
          </TouchableOpacity>
        </View>

        {/* Log Out */}
        <View style={styles.sectionCustom}>
          <TouchableOpacity
            style={styles.logoutButtonCustom}
            onPress={handleLogout}
          >
            <Text style={styles.logoutButtonTextCustom}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  headerContainerCustom: {
    alignItems: "center",
    paddingTop: 32,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F1F4",
  },
  profileTitle: {
    fontSize: 18,
    fontWeight: "500",
    color: "#22223A",
    marginBottom: 16,
  },
  avatarWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarBorder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: "#4779FF",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  avatarImage: {
    width: 74,
    height: 74,
    borderRadius: 37,
  },
  cameraIconWrapper: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#4779FF",
    borderRadius: 12,
    padding: 4,
    borderWidth: 2,
    borderColor: "#fff",
  },
  walletName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#22223A",
    marginTop: 8,
    marginBottom: 8,
  },
  sectionCustom: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 0,
  },
  sectionLabel: {
    fontSize: 14,
    color: "#A1A1AA",
    fontWeight: "500",
    marginBottom: 10,
  },
  cardButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#22223A",
  },
  menuItemCustom: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F1F4",
  },
  menuItemTextCustom: {
    flex: 1,
    fontSize: 16,
    marginLeft: 15,
    color: "#22223A",
  },
  logoutButtonCustom: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 24,
    borderWidth: 1,
    borderColor: "#F1F1F4",
  },
  logoutButtonTextCustom: {
    color: "#22223A",
    fontSize: 16,
    fontWeight: "600",
  },
  bottomNavBg: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 110,
    backgroundColor: "#FAFAFC",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 4,
  },
  bottomNavContent: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    width: "100%",
    height: 90,
    paddingHorizontal: 30,
    paddingBottom: 10,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  navIcon: {
    fontSize: 24,
    color: "#A1A1AA",
    marginBottom: 2,
  },
  navLabel: {
    fontSize: 13,
    color: "#A1A1AA",
  },
  navItemActiveWrapper: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  navActiveCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#22223A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  navIconActive: {
    fontSize: 24,
    color: "#fff",
  },
  navLabelActive: {
    fontSize: 13,
    color: "#22223A",
    fontWeight: "600",
    marginTop: 2,
  },
});

export default ProfileScreen;
