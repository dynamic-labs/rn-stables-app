import { useReactiveClient } from "@dynamic-labs/react-hooks";
import { RouteProp, useRoute } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { encodeFunctionData, parseUnits } from "viem";
import { baseSepolia } from "viem/chains";
import { client } from "../client";
import InitialsAvatar from "../components/InitialsAvatar";
import { supabase } from "../lib/supabase";
import { fetchTokenBalances, TokenBalance } from "../utils/balance";
import { ERC20_ABI, USDC_CONTRACT } from "../utils/constants";

type SendScreenParams = {
  recipient?: string;
  amount?: string;
  note?: string;
  paymentLinkId?: string;
};

type SendScreenRouteProp = RouteProp<{ params: SendScreenParams }, "params">;

interface QuickPayUser {
  id: string;
  name: string;
  email: string;
  profilePictureUrl?: string | null;
}

const SendScreen = () => {
  const { wallets, auth } = useReactiveClient(client);
  const route = useRoute<SendScreenRouteProp>();
  const [amount, setAmount] = useState(route.params?.amount || "");
  const [recipient, setRecipient] = useState(route.params?.recipient || "");
  const [note, setNote] = useState(route.params?.note || "");
  const [isLoading, setIsLoading] = useState(false);
  const [balance, setBalance] = useState<string>("0");
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [recipientLocked, setRecipientLocked] = useState(false);
  const [step, setStep] = useState(
    route.params?.recipient && route.params?.amount ? 3 : 1
  );
  const [selectedRecipient, setSelectedRecipient] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [paymentDate, setPaymentDate] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [quickPayUsers, setQuickPayUsers] = useState<QuickPayUser[]>([]);
  const [lastSentPayment, setLastSentPayment] = useState<{
    amount: string;
    recipient: any;
    note: string;
    date: string;
    status: string;
  } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Handle payment link data from deep link
    if (route.params) {
      const {
        recipient: linkRecipient,
        amount: linkAmount,
        note: linkNote,
      } = route.params;
      if (linkRecipient) setRecipient(linkRecipient);
      if (linkAmount) setAmount(linkAmount);
      if (linkNote) setNote(linkNote);
    }
  }, [route.params]);

  // Fetch USDC balance when wallet changes
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const primaryWallet = client.wallets.primary;
        if (!primaryWallet) return;
        const accountAddress = primaryWallet.address;
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
    fetchBalance();
  }, [wallets.primary]);

  // Fetch users for quick pay (exclude current user)
  useEffect(() => {
    const fetchUsers = async () => {
      const email = auth.authenticatedUser?.email || "";
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, full_name, email, profile_picture_url")
        .neq("email", email)
        .limit(10);
      if (!usersError && users) {
        const formattedUsers = users.map((user: any) => ({
          id: user.id,
          name: user.full_name || user.email,
          email: user.email,
          profilePictureUrl: user.profile_picture_url,
        }));
        setQuickPayUsers(formattedUsers);
      }
    };
    fetchUsers();
  }, [auth.authenticatedUser]);

  // Filtered recipients for search
  const filteredRecipients = quickPayUsers.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase())
  );

  // If recipient param is provided, preselect the recipient once users are loaded
  useEffect(() => {
    if (route.params?.recipient && quickPayUsers.length > 0) {
      const found = quickPayUsers.find(
        (u) => u.email.toLowerCase() === route.params.recipient?.toLowerCase()
      );
      if (found) {
        setSelectedRecipient(found);
        setRecipientLocked(true);
        // If recipient, amount, and note are provided, skip to review screen
        if (route.params?.amount && route.params?.note) {
          setStep(4); // Go directly to review
        } else if (route.params?.amount) {
          setStep(3); // Go to note step
        } else {
          setStep(2); // Go to recipient step
        }
      } else {
        setStep(2);
        setRecipientLocked(false);
      }
      setReady(true);
    } else if (route.params?.amount) {
      setStep(2);
      setRecipientLocked(false);
      setReady(true);
    } else if (quickPayUsers.length > 0 || !route.params) {
      // If no params, or users loaded, ready
      setReady(true);
    }
    // If no params, default flow
  }, [route.params, quickPayUsers]);

  // Move send logic to review step
  const handleSend = async () => {
    setIsLoading(true);
    try {
      let recipientAddress = selectedRecipient?.email || recipient;
      let recipientEmail = selectedRecipient?.email || recipient;

      // If recipient is an email, resolve to wallet address
      if (!recipientAddress.startsWith("0x")) {
        const { data, error } = await supabase
          .from("users")
          .select("wallet_address")
          .eq("email", recipientEmail)
          .single();

        if (error || !data?.wallet_address) {
          throw new Error("Recipient email not found");
        }
        recipientAddress = data.wallet_address;
      }

      // Ensure wallet is available
      const primaryWallet = client.wallets.primary;
      if (!primaryWallet) {
        throw new Error("No primary wallet found");
      }

      // Create wallet client using Dynamic + Viem
      const walletViemClient = client.viem.createWalletClient({
        wallet: primaryWallet,
        chain: baseSepolia,
      });

      // Convert USD amount to USDC (6 decimals)
      const usdcAmount = parseUnits(amount, 6);

      // Encode transfer data
      const data = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [recipientAddress, usdcAmount],
      });

      // Send USDC transaction
      const hash = await (
        await walletViemClient
      ).sendTransaction({
        to: USDC_CONTRACT,
        value: 0n,
        data,
      });

      // Record transaction in Supabase
      const { error: insertError } = await supabase
        .from("transactions")
        .insert([
          {
            sender_email: auth.authenticatedUser?.email || "",
            recipient_email: recipientEmail,
            sender_address: wallets.userWallets[0]?.address,
            recipient_address: recipientAddress,
            amount: parseFloat(amount),
            status: "completed",
            tx_hash: hash,
            note,
          },
        ]);
      if (insertError) {
        throw new Error(`Failed to insert transaction: ${insertError.message}`);
      }

      // If this was from a payment link, update its status
      if (route.params?.paymentLinkId) {
        await supabase
          .from("payment_links")
          .update({ status: "completed" })
          .eq("id", route.params.paymentLinkId);
      }

      const sentPayment = {
        amount,
        recipient: selectedRecipient,
        note,
        date: new Date().toLocaleDateString(),
        status: "Complete",
      };
      setLastSentPayment(sentPayment);
      setPaymentDate(sentPayment.date);
      setStatus(sentPayment.status);
      setStep(5);
      setAmount("");
      setRecipient("");
      setNote("");
      setSelectedRecipient(null);
    } catch (error) {
      console.error("Send error:", error);
      let errorMessage = "Failed to send transaction. Please try again.";

      if (error instanceof Error) {
        if (error.message.includes("transfer amount exceeds balance")) {
          errorMessage =
            "Insufficient USDC balance. Please check your balance and try again.";
        } else if (error.message.includes("user rejected")) {
          errorMessage = "Transaction was rejected. Please try again.";
        } else {
          errorMessage = error.message;
        }
      }

      Alert.alert("Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!ready) return null;

  // Step 1: Enter Amount
  if (step === 1) {
    const isAmountValid =
      !!amount && !isNaN(Number(amount)) && Number(amount) > 0;
    return (
      <View style={{ flex: 1, backgroundColor: "#fafbfc" }}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>Send</Text>
        </View>
        {/* Main Content */}
        <View style={styles.topContentContainer}>
          <Text style={styles.subtitle}>How much ?</Text>
          <TextInput
            style={styles.balanceInput}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="$0.00"
            textAlign="center"
          />
          <Text style={styles.balanceHint}>Your balance ${balance}</Text>
          <TouchableOpacity
            style={[styles.button, !isAmountValid && styles.buttonDisabled]}
            onPress={() => setStep(2)}
            disabled={!isAmountValid}
          >
            <Text style={styles.buttonText}>Continue →</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Step 2: Select Recipient
  if (step === 2) {
    // If recipient is locked, skip this step
    if (recipientLocked && selectedRecipient) {
      setStep(3);
      return null;
    }
    return (
      <View style={{ flex: 1, backgroundColor: "#fafbfc" }}>
        <TouchableOpacity
          style={styles.backButtonAbsolute}
          onPress={() => {
            setSelectedRecipient(null);
            setStep(1);
          }}
        >
          <Text style={styles.backButtonText}>{"< Back"}</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, padding: 24, justifyContent: "flex-start" }}>
          <Text style={styles.title}>To who?</Text>
          <Text style={styles.subtitle}>How much ?</Text>
          <Text style={styles.amount}>${amount}</Text>
          <TextInput
            style={styles.input}
            placeholder="Search name or number"
            value={search}
            onChangeText={setSearch}
          />
          <FlatList
            data={filteredRecipients}
            keyExtractor={(item) => item.id}
            style={{ width: "100%" }}
            contentContainerStyle={{ width: "100%" }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.recipientRow}
                onPress={() => {
                  setSelectedRecipient(item);
                  setStep(3);
                }}
              >
                {item.profilePictureUrl ? (
                  <Image
                    source={{ uri: item.profilePictureUrl }}
                    style={styles.avatar}
                  />
                ) : (
                  <InitialsAvatar
                    name={item.name || item.email}
                    size={40}
                    style={{ marginRight: 12 }}
                  />
                )}
                <Text style={styles.recipientName}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    );
  }

  // Step 3: Add Note
  if (step === 3) {
    return (
      <View style={{ flex: 1, backgroundColor: "#fafbfc" }}>
        <TouchableOpacity
          style={styles.backButtonAbsolute}
          onPress={() => setStep(2)}
        >
          <Text style={styles.backButtonText}>{"< Back"}</Text>
        </TouchableOpacity>
        <View style={styles.centeredContainer}>
          <Text style={styles.title}>Add a note</Text>
          <Text style={styles.subtitle}>What's this payment for?</Text>
          <TextInput
            style={styles.input}
            placeholder="Dinner, rent, movies...."
            value={note}
            onChangeText={setNote}
          />
          <TouchableOpacity style={styles.button} onPress={() => setStep(4)}>
            <Text style={styles.buttonText}>Continue →</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Step 4: Review Payment
  if (step === 4) {
    return (
      <View style={{ flex: 1, backgroundColor: "#fafbfc" }}>
        <TouchableOpacity
          style={styles.backButtonAbsolute}
          onPress={() => setStep(3)}
          disabled={recipientLocked}
        >
          <Text
            style={[styles.backButtonText, recipientLocked && { opacity: 0.5 }]}
          >
            {"< Back"}
          </Text>
        </TouchableOpacity>
        <View style={styles.centeredContainer}>
          <Text style={styles.title}>Review Payment</Text>
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.label}>Amount</Text>
              <Text style={styles.value}>${amount}</Text>
            </View>
            <View style={styles.rowBetween}>
              <Text style={styles.label}>To</Text>
              <View style={styles.rowCenter}>
                {selectedRecipient?.profilePictureUrl ? (
                  <Image
                    source={{ uri: selectedRecipient.profilePictureUrl }}
                    style={styles.avatarSmall}
                  />
                ) : (
                  <InitialsAvatar
                    name={selectedRecipient?.name || selectedRecipient?.email}
                    size={28}
                    style={{ marginRight: 8 }}
                  />
                )}
                <Text style={styles.value}>{selectedRecipient?.name}</Text>
              </View>
            </View>
            <View style={styles.rowBetween}>
              <Text style={styles.label}>Note</Text>
              <Text style={styles.value}>{note}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.button}
            onPress={handleSend}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? "Sending..." : "Send Payment"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Step 5: Payment Sent
  if (step === 5) {
    const sent = lastSentPayment;
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.title}>Payment Sent!</Text>
        <Image
          source={require("../assets/images/fire.png")}
          style={styles.fireIcon}
        />
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>Amount</Text>
            <Text style={styles.value}>${sent?.amount}</Text>
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>To</Text>
            <View style={styles.rowCenter}>
              {sent?.recipient?.profilePictureUrl ? (
                <Image
                  source={{ uri: sent.recipient.profilePictureUrl }}
                  style={styles.avatarSmall}
                />
              ) : (
                <InitialsAvatar
                  name={sent?.recipient?.name || sent?.recipient?.email}
                  size={28}
                  style={{ marginRight: 8 }}
                />
              )}
              <Text style={styles.value}>{sent?.recipient?.name}</Text>
            </View>
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>Note</Text>
            <Text style={styles.value}>{sent?.note}</Text>
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>{sent?.date}</Text>
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>Status</Text>
            <Text style={styles.statusComplete}>{sent?.status}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.button} onPress={() => setStep(1)}>
          <Text style={styles.buttonText}>Done</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // fallback
  return null;
};

const styles = StyleSheet.create({
  centeredContainer: {
    flex: 1,
    backgroundColor: "#fafbfc",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 12,
    color: "#222",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#888",
    marginBottom: 8,
    textAlign: "center",
  },
  amount: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#222",
    marginBottom: 8,
    textAlign: "center",
  },
  balanceHint: {
    color: "#bbb",
    marginBottom: 24,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 12,
    padding: 14,
    fontSize: 18,
    marginBottom: 16,
    backgroundColor: "#fff",
    width: "100%",
  },
  button: {
    backgroundColor: "#4F7CFE",
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: "center",
    marginTop: 16,
    width: "100%",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginVertical: 20,
    width: "100%",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  rowCenter: {
    flexDirection: "row",
    alignItems: "center",
  },
  label: {
    color: "#888",
    fontSize: 16,
  },
  value: {
    color: "#222",
    fontSize: 16,
    fontWeight: "500",
  },
  statusComplete: {
    color: "#1BC47D",
    fontWeight: "bold",
    fontSize: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
  },
  recipientRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    width: "100%",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  recipientName: {
    color: "#222",
    fontSize: 16,
    fontWeight: "500",
  },
  fireIcon: {
    width: 80,
    height: 80,
    alignSelf: "center",
    marginVertical: 16,
  },
  balanceInput: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#222",
    marginBottom: 18,
    backgroundColor: "transparent",
    borderWidth: 0,
    padding: 0,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  backButtonText: {
    color: "#4F7CFE",
    fontSize: 16,
    fontWeight: "500",
  },
  backButtonAbsolute: {
    position: "absolute",
    top: 48, // or adjust for your status bar
    left: 24,
    zIndex: 10,
  },
  headerContainer: {
    width: "100%",
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F1F4",
    backgroundColor: "#fafbfc",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#222",
    textAlign: "center",
  },
  topContentContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 24,
    paddingTop: 40,
    width: "100%",
  },
});

export default SendScreen;
