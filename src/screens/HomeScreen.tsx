import { useReactiveClient } from "@dynamic-labs/react-hooks";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { client } from "../client";
import { supabase } from "../lib/supabase";
import { Database } from "../types/database.types";
import InitialsAvatar from "../components/InitialsAvatar";
import SkeletonLoader from "../components/SkeletonLoader";
import { USDC_CONTRACT } from "../utils/constants";
import { fetchTokenBalances, TokenBalance } from "../utils/balance";

interface FundRequest {
  id: string;
  amount: string;
  from: string;
  to: string;
  date: string;
  status: string;
  note?: string | null;
}

interface QuickPayUser {
  id: string;
  name: string;
  email: string;
  profilePictureUrl?: string | null;
}

type MainAppTabParamList = {
  Home: undefined;
  Send: { recipient?: string } | undefined;
  Request: undefined;
  Profile: undefined;
};

const HomeScreen: React.FC = () => {
  const [recentTransactions, setRecentTransactions] = useState<
    (Database["public"]["Tables"]["transactions"]["Row"] & {
      sender_name?: string;
      recipient_name?: string;
    })[]
  >([]);
  const [fundRequests, setFundRequests] = useState<FundRequest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const { auth, wallets } = useReactiveClient(client);
  const navigation =
    useNavigation<BottomTabNavigationProp<MainAppTabParamList>>();
  const [quickPayUsers, setQuickPayUsers] = useState<QuickPayUser[]>([]);
  const [balance, setBalance] = useState<string>("0");
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);

  const fetchData = async () => {
    try {
      const email = auth.authenticatedUser?.email || "";
      const address = wallets.primary?.address || "";
      if (!email && !address) throw new Error("No user email or address found");

      // First get all users to have a name mapping
      const { data: usersList, error: userListError } = await supabase
        .from("users")
        .select("email, full_name");
      if (userListError) throw userListError;

      // Create a map of email to name
      const userNameMap = Object.fromEntries(
        (usersList || []).map((user: any) => [
          user.email,
          user.full_name || user.email,
        ])
      );

      const { data: transactions, error: txError } = await supabase
        .from("transactions")
        .select(
          "id, amount, created_at, tx_hash, sender_email, recipient_email, sender_address, recipient_address, status, type, note"
        )
        .or(
          `sender_email.eq.${email},recipient_email.eq.${email},sender_email.eq.${address},recipient_email.eq.${address}`
        )
        .order("created_at", { ascending: false })
        .limit(5);
      if (txError) throw txError;
      setRecentTransactions(
        transactions
          ? transactions.map((tx) => ({
              ...tx,
              sender_name: userNameMap[tx.sender_email] || tx.sender_email,
              recipient_name:
                userNameMap[tx.recipient_email] || tx.recipient_email,
            }))
          : []
      );

      const { data: fundReqs, error: fundReqError } = await supabase
        .from("fund_requests")
        .select(
          "id, amount, created_at, sender_email, recipient_email, sender_address, recipient_address, status, note"
        )
        .or(
          `sender_email.eq.${email},recipient_email.eq.${email},sender_address.eq.${address},recipient_address.eq.${address}`
        )
        .order("created_at", { ascending: false })
        .limit(5);
      if (fundReqError) throw fundReqError;
      const formattedFundRequests = (fundReqs || []).map((req: any) => {
        const isSent =
          req.sender_email === email || req.sender_address === address;
        return {
          id: req.id,
          amount: req.amount.toString(),
          from: req.sender_email || req.sender_address,
          to: req.recipient_email || req.recipient_address,
          date: req.created_at
            ? new Date(req.created_at).toLocaleDateString()
            : "",
          status: req.status,
          note: req.note,
        };
      });
      setFundRequests(formattedFundRequests);
      const { data: quickPayUsersList, error: quickPayUsersError } =
        await supabase
          .from("users")
          .select("id, full_name, email, profile_picture_url")
          .neq("email", email)
          .limit(10);
      if (quickPayUsersError) throw quickPayUsersError;
      const formattedUsers = (quickPayUsersList || []).map((user: any) => ({
        id: user.id,
        name: user.full_name || user.email,
        email: user.email,
        profilePictureUrl: user.profile_picture_url,
      }));
      setQuickPayUsers(formattedUsers);
    } catch (error) {
      console.error("Error fetching data:", error);
      Alert.alert("Error", "Failed to load data. Please try again.");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const fetchBalance = async () => {
    try {
      if (!wallets.primary) return;
      const accountAddress = wallets.primary.address;
      const tokens = await fetchTokenBalances({ accountAddress });
      setTokenBalances(tokens);
      // Prefer USDC, fallback to native
      const usdc = tokens.find(
        (t) =>
          t.symbol === "USDC" ||
          t.address.toLowerCase() === USDC_CONTRACT.toLowerCase()
      );
      const native = tokens.find((t) => t.isNative);
      const rawBalance = usdc ? usdc.balance : native ? native.balance : 0;
      // Round down to 1 decimal place
      const roundedBalance = Math.floor(rawBalance * 10) / 10;
      setBalance(roundedBalance.toString());
    } catch (error) {
      console.error("Error fetching balance:", error);
      setBalance("0");
      setTokenBalances([]);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchData();
    fetchBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.authenticatedUser, wallets.primary]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
    fetchBalance();
  };

  // Helper for time ago
  const timeAgo = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  // Main render
  return (
    <View style={{ flex: 1, backgroundColor: "#fafbfc" }}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.bg}
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Top Bar */}
          <View style={styles.topBarCard}>
            <TouchableOpacity style={styles.topBarIcon}>
              <Icon name="qrcode-scan" size={22} color="#888" />
            </TouchableOpacity>
            <Text style={styles.greetingText} numberOfLines={1}>
              🌟 Good morning {auth.authenticatedUser?.firstName || "User"}
            </Text>
            <TouchableOpacity style={styles.topBarIcon}>
              <Icon name="bell-outline" size={22} color="#888" />
            </TouchableOpacity>
          </View>

          {/* Balance Card */}
          <View style={styles.balanceCard}>
            <Text style={styles.balanceCardLabel}>Available balance</Text>
            <Text style={styles.balanceCardAmount}>${balance}</Text>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.pillButton}
                onPress={() => client.ui.fundingOptions.show()}
              >
                <Icon
                  name="tray-arrow-down"
                  size={22}
                  color="#222"
                  style={styles.pillButtonIcon}
                />
                <Text style={styles.pillButtonText}>Deposit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.pillButton}
                onPress={() => navigation.navigate("Send")}
              >
                <Icon
                  name="send"
                  size={22}
                  color="#222"
                  style={styles.pillButtonIcon}
                />
                <Text style={styles.pillButtonText}>Send</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.pillButton}
                onPress={() => navigation.navigate("Request")}
              >
                <Icon
                  name="tray-arrow-up"
                  size={22}
                  color="#222"
                  style={styles.pillButtonIcon}
                />
                <Text style={styles.pillButtonText}>Request</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Pay Row */}
          <View style={styles.quickPayRow}>
            <Text style={styles.quickPayLabel}>Quick pay</Text>
            {isLoading ? (
              <View style={styles.quickPaySkeletonContainer}>
                {[...Array(4)].map((_, index) => (
                  <View key={index} style={styles.quickPaySkeletonItem}>
                    <SkeletonLoader
                      width={48}
                      height={48}
                      borderRadius={24}
                      style={{ marginBottom: 4 }}
                    />
                    <SkeletonLoader width={40} height={12} borderRadius={6} />
                  </View>
                ))}
              </View>
            ) : (
              <FlatList
                data={quickPayUsers}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.quickPayItem}
                    onPress={() =>
                      navigation.navigate("Send", { recipient: item.email })
                    }
                  >
                    {item.profilePictureUrl ? (
                      <Image
                        source={{ uri: item.profilePictureUrl }}
                        style={styles.quickPayAvatar}
                      />
                    ) : (
                      <InitialsAvatar
                        name={item.name || item.email}
                        size={48}
                        style={{ marginBottom: 4 }}
                      />
                    )}
                    <Text style={styles.quickPayName} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                )}
                ListFooterComponent={
                  <TouchableOpacity style={styles.quickPayAdd}>
                    <Icon name="plus-circle-outline" size={36} color="#bbb" />
                    <Text style={styles.quickPayName}>Add</Text>
                  </TouchableOpacity>
                }
              />
            )}
          </View>

          {/* Friend Activity / Transactions */}
          <View style={styles.activitySection}>
            <Text style={styles.sectionTitle}>Friend Activity</Text>
            {isLoading ? (
              <View>
                {[...Array(3)].map((_, index) => (
                  <View key={index} style={styles.activitySkeletonCard}>
                    <SkeletonLoader width={48} height={48} borderRadius={24} />
                    <View style={styles.activitySkeletonDetails}>
                      <View style={styles.activitySkeletonRowTop}>
                        <SkeletonLoader
                          width="60%"
                          height={16}
                          borderRadius={8}
                        />
                        <SkeletonLoader
                          width={60}
                          height={16}
                          borderRadius={8}
                        />
                      </View>
                      <SkeletonLoader
                        width="40%"
                        height={12}
                        borderRadius={6}
                        style={{ marginTop: 8 }}
                      />
                      <SkeletonLoader
                        width={80}
                        height={10}
                        borderRadius={5}
                        style={{ marginTop: 6 }}
                      />
                    </View>
                  </View>
                ))}
              </View>
            ) : recentTransactions.length === 0 ? (
              <View style={styles.noActivity}>
                <Icon name="close-circle-outline" size={48} color="#ccc" />
                <Text style={styles.noActivityText}>No Activity</Text>
              </View>
            ) : (
              recentTransactions.map((tx) => {
                const isSent =
                  tx.sender_email ===
                  (auth.authenticatedUser?.email || wallets.primary?.address);
                return (
                  <View key={tx.id} style={styles.activityCard}>
                    <InitialsAvatar
                      name={
                        isSent
                          ? tx.recipient_name || tx.recipient_email
                          : tx.sender_name || tx.sender_email
                      }
                      size={48}
                      style={{ marginRight: 0 }}
                    />
                    <View style={styles.activityDetails}>
                      <View style={styles.activityRowTop}>
                        <Text style={styles.activityTitle} numberOfLines={1}>
                          {isSent
                            ? `You paid ${tx.recipient_name || tx.recipient_email}`
                            : `${tx.sender_name || tx.sender_email} paid you`}
                        </Text>
                        <Text
                          style={[
                            styles.activityAmount,
                            {
                              color: isSent ? "#F44336" : "#22B573",
                            },
                          ]}
                        >
                          {isSent ? "-" : "+"}${tx.amount}
                        </Text>
                      </View>
                      {tx.note && (
                        <Text style={styles.activityNote} numberOfLines={1}>
                          "{tx.note}"
                        </Text>
                      )}
                      <View style={styles.activityRowBottom}>
                        <Text style={styles.activityTime}>
                          {tx.created_at ? timeAgo(tx.created_at) : ""}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F6F7F9",
  },
  bg: {
    flex: 1,
    backgroundColor: "#F6F7F9",
  },
  topBarCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 10,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  topBarIcon: {
    padding: 6,
  },
  greetingText: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
    color: "#222",
  },
  balanceCard: {
    marginHorizontal: 18,
    marginTop: 18,
    backgroundColor: "#F7F8FA",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  balanceCardLabel: {
    fontSize: 16,
    color: "#888",
    marginBottom: 6,
    fontWeight: "500",
  },
  balanceCardAmount: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#222",
    marginBottom: 18,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginTop: 8,
    gap: 12,
    paddingHorizontal: 8,
  },
  pillButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    backgroundColor: "#fff",
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "#E0E4EA",
    paddingVertical: 18,
    paddingHorizontal: 0,
    marginHorizontal: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    minWidth: 90,
    maxWidth: 120,
  },
  pillButtonIcon: {
    marginBottom: 6,
    marginRight: 0,
  },
  pillButtonText: {
    fontSize: 16,
    color: "#222",
    fontWeight: "600",
  },
  quickPayRow: {
    marginTop: 18,
    marginHorizontal: 0,
    paddingLeft: 18,
    paddingRight: 0,
    paddingVertical: 16,
    backgroundColor: "#F7F8FA",
    flexDirection: "column",
    alignItems: "center",
    borderRadius: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  quickPayLabel: {
    fontSize: 16,
    color: "#888",
    fontWeight: "600",
    marginBottom: 12,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  quickPayItem: {
    alignItems: "center",
    marginRight: 18,
    width: 64,
  },
  quickPayAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#3777F3",
    marginBottom: 4,
  },
  quickPayName: {
    fontSize: 13,
    color: "#444",
    textAlign: "center",
    width: 56,
    fontWeight: "500",
  },
  quickPayAdd: {
    alignItems: "center",
    marginRight: 18,
    marginTop: 0,
    width: 64,
  },
  quickPaySkeletonContainer: {
    flexDirection: "row",
    paddingRight: 18,
  },
  quickPaySkeletonItem: {
    alignItems: "center",
    marginRight: 18,
    width: 64,
  },
  activitySection: {
    marginTop: 18,
    marginHorizontal: 0,
    paddingHorizontal: 18,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "bold",
    marginBottom: 14,
    color: "#222",
  },
  activityCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  activityDetails: {
    marginLeft: 14,
    flex: 1,
  },
  activityRowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#222",
    flex: 1,
    marginRight: 8,
  },
  activityAmount: {
    fontSize: 16,
    fontWeight: "bold",
  },
  activityNote: {
    fontSize: 13,
    color: "#888",
    marginBottom: 2,
    fontStyle: "italic",
  },
  activityRowBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    marginTop: 2,
  },
  activityTime: {
    fontSize: 12,
    color: "#bbb",
  },
  activitySkeletonCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  activitySkeletonDetails: {
    marginLeft: 14,
    flex: 1,
  },
  activitySkeletonRowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  noActivity: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  noActivityText: {
    fontSize: 16,
    color: "#bbb",
    marginTop: 10,
  },
  loadingText: {
    textAlign: "center",
    color: "#888",
    marginTop: 20,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e0e4ea",
  },
  avatarInitials: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#666",
  },
  avatarBlueBorder: {
    borderWidth: 2,
    borderColor: "#3777F3",
  },
  avatarGrayBorder: {
    borderWidth: 2,
    borderColor: "#e0e4ea",
  },
  backButtonAbsolute: {
    position: "absolute",
    top: 48, // or adjust for your status bar
    left: 24,
    zIndex: 10,
  },
  backButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#3777F3",
  },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default HomeScreen;
