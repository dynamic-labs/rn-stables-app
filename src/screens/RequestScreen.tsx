import * as Clipboard from "expo-clipboard";
import React, { useState, useEffect } from "react";
import {
  Alert,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import { useReactiveClient } from "@dynamic-labs/react-hooks";
import { client } from "../client";
import { supabase } from "../lib/supabase";
import InitialsAvatar from "../components/InitialsAvatar";

const RequestScreen = () => {
  const { wallets, auth } = useReactiveClient(client);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [step, setStep] = useState(1);
  const [linkLoading, setLinkLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [linkId, setLinkId] = useState<string | null>(null);
  // Recipient path state
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [lastRequest, setLastRequest] = useState<any>(null);
  const [recipientNote, setRecipientNote] = useState("");

  useEffect(() => {
    if (step === 3) {
      // Fetch users for recipient selection
      const fetchUsers = async () => {
        const email = auth.authenticatedUser?.email || "";
        const { data: users, error } = await supabase
          .from("users")
          .select("id, full_name, email, profile_picture_url")
          .neq("email", email)
          .limit(20);
        if (!error && users) {
          setUsers(
            users.map((user: any) => ({
              id: user.id,
              name: user.full_name || user.email,
              email: user.email,
              profilePictureUrl: user.profile_picture_url,
            }))
          );
        }
      };
      fetchUsers();
    }
  }, [step, auth.authenticatedUser]);

  // Step 1: Enter Amount
  if (step === 1) {
    const isAmountValid =
      !!amount && !isNaN(Number(amount)) && Number(amount) > 0;
    return (
      <View style={{ flex: 1, backgroundColor: "#fafbfc" }}>
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>Request</Text>
        </View>
        <View style={styles.topContentContainer}>
          <Text style={styles.subtitle}>How much?</Text>
          <TextInput
            style={styles.balanceInput}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="$0.00"
            textAlign="center"
          />
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

  // Step 2: Choose Path
  if (step === 2) {
    return (
      <View style={{ flex: 1, backgroundColor: "#fafbfc" }}>
        <TouchableOpacity
          style={styles.backButtonAbsolute}
          onPress={() => setStep(1)}
        >
          <Text style={styles.backButtonText}>{"< Back"}</Text>
        </TouchableOpacity>
        <View style={styles.centeredContainer}>
          <Text style={styles.header}>Request</Text>
          <Text style={styles.prompt}>What would you like to do?</Text>
          <TouchableOpacity style={styles.button} onPress={() => setStep(3)}>
            <Text style={styles.buttonText}>Select Recipient</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#22223A" }]}
            onPress={() => setStep(4)}
          >
            <Text style={styles.buttonText}>Generate General Link</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Step 3: Recipient Selection
  if (step === 3) {
    const filteredRecipients = users.filter(
      (r) =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.email.toLowerCase().includes(search.toLowerCase())
    );
    return (
      <View style={{ flex: 1, backgroundColor: "#fafbfc" }}>
        <TouchableOpacity
          style={styles.backButtonAbsolute}
          onPress={() => setStep(2)}
        >
          <Text style={styles.backButtonText}>{"< Back"}</Text>
        </TouchableOpacity>
        <View style={styles.centeredContainer}>
          <Text style={styles.header}>Select Recipient</Text>
          <TextInput
            style={styles.input}
            placeholder="Search name or email"
            value={search}
            onChangeText={setSearch}
          />
          {filteredRecipients.map((item) => (
            <TouchableOpacity
              key={item.email}
              style={styles.recipientRow}
              onPress={() => {
                setSelectedRecipient(item);
                setStep(5);
              }}
            >
              {item.profilePictureUrl ? (
                <Image
                  source={{ uri: item.profilePictureUrl }}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    marginRight: 12,
                  }}
                />
              ) : (
                <InitialsAvatar
                  name={item.name || item.email}
                  size={40}
                  style={{ marginRight: 12 }}
                />
              )}
              <View
                style={{
                  flex: 1,
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <Text style={styles.recipientName}>{item.name}</Text>
                <Text style={styles.recipientEmail}>{item.email}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  // Step 4: Add Note and Generate General Link
  if (step === 4) {
    const isReady = !!amount;

    const handleGenerateLink = async () => {
      setLinkLoading(true);
      try {
        let paymentLinkId = linkId;
        if (!paymentLinkId) {
          const { data, error } = await supabase
            .from("payment_links")
            .insert([
              {
                amount: amount,
                from:
                  auth.authenticatedUser?.email ||
                  wallets.userWallets[0]?.address ||
                  "",
                note: note,
                status: "pending",
              },
            ])
            .select()
            .single();
          if (error && error.code !== "23505") throw error;
          if (data && data.id) {
            paymentLinkId = data.id;
            setLinkId(paymentLinkId);
          } else {
            throw new Error("Failed to create payment link");
          }
        }
        const url = `https://stables-deeplink.vercel.app/send/${paymentLinkId}`;
        setGeneratedLink(url);
        Share.share({ message: url });
      } catch (error) {
        Alert.alert("Error", "Failed to generate link.");
      } finally {
        setLinkLoading(false);
      }
    };

    const handleCopyLink = async () => {
      if (generatedLink) {
        await Clipboard.setStringAsync(generatedLink);
        Alert.alert("Copied!", "Link copied to clipboard.");
      }
    };

    return (
      <View style={{ flex: 1, backgroundColor: "#fafbfc" }}>
        <TouchableOpacity
          style={styles.backButtonAbsolute}
          onPress={() => setStep(2)}
        >
          <Text style={styles.backButtonText}>{"< Back"}</Text>
        </TouchableOpacity>
        <View style={styles.centeredContainer}>
          <Text style={styles.header}>Request</Text>
          <Text style={styles.prompt}>Add a note (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Add a note to your request"
            value={note}
            onChangeText={setNote}
          />
          <TouchableOpacity
            style={[
              styles.button,
              (linkLoading || !isReady) && styles.buttonDisabled,
            ]}
            onPress={handleGenerateLink}
            disabled={linkLoading || !isReady}
          >
            <Text style={styles.buttonText}>
              {linkLoading ? "Generating..." : "Generate Link"}
            </Text>
          </TouchableOpacity>
          {generatedLink && (
            <View style={{ marginTop: 16, alignItems: "center" }}>
              <Text
                style={{
                  color: "#4F7CFE",
                  marginBottom: 8,
                  textAlign: "center",
                }}
                selectable
              >
                {generatedLink}
              </Text>
              <TouchableOpacity
                onPress={handleCopyLink}
                style={[
                  styles.button,
                  {
                    backgroundColor: "#4F7CFE",
                    width: 180,
                    paddingVertical: 10,
                  },
                ]}
              >
                <Text style={styles.buttonText}>Copy Link</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  }

  // Step 5: Add Note for Recipient Request
  if (step === 5 && selectedRecipient) {
    const isReady = !!amount;

    const handleRequest = async () => {
      setIsLoading(true);
      try {
        // Fetch recipient wallet address
        let recipientAddress = null;
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("wallet_address")
          .eq("email", selectedRecipient.email)
          .single();
        if (userError || !userData?.wallet_address) {
          throw new Error("Recipient wallet address not found");
        }
        recipientAddress = userData.wallet_address;
        // Insert fund request for recipient
        const { data, error } = await supabase
          .from("fund_requests")
          .insert([
            {
              amount: parseFloat(amount),
              recipient_email: selectedRecipient.email,
              recipient_address: recipientAddress,
              sender_address: wallets.userWallets[0]?.address,
              sender_email: auth.authenticatedUser?.email || "",
              note: recipientNote,
              status: "pending",
            },
          ])
          .select()
          .single();
        if (error) throw error;
        setRequestId(data.id);
        setLastRequest({
          amount,
          recipient: selectedRecipient,
          note: recipientNote,
        });
        setStep(6);
        setAmount("");
        setRecipientNote("");
        setSelectedRecipient(null);
      } catch (error) {
        Alert.alert(
          "Error",
          error instanceof Error
            ? error.message
            : "Failed to create fund request. Please try again."
        );
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <View style={{ flex: 1, backgroundColor: "#fafbfc" }}>
        <TouchableOpacity
          style={styles.backButtonAbsolute}
          onPress={() => setStep(3)}
        >
          <Text style={styles.backButtonText}>{"< Back"}</Text>
        </TouchableOpacity>
        <View style={styles.centeredContainer}>
          <Text style={styles.header}>Request</Text>
          <Text style={styles.prompt}>Add a note (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Add a note to your request"
            value={recipientNote}
            onChangeText={setRecipientNote}
          />
          <TouchableOpacity
            style={[
              styles.button,
              (isLoading || !isReady) && styles.buttonDisabled,
            ]}
            onPress={handleRequest}
            disabled={isLoading || !isReady}
          >
            <Text style={styles.buttonText}>
              {isLoading ? "Creating..." : "Create Request"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Step 6: Confirmation for Recipient Request
  if (step === 6 && lastRequest) {
    const req = lastRequest;
    return (
      <View style={{ flex: 1, backgroundColor: "#fafbfc" }}>
        <View style={styles.centeredContainer}>
          <Text style={styles.header}>Request Sent!</Text>
          <View style={styles.recipientRow}>
            {req.recipient?.profilePictureUrl ? (
              <Image
                source={{ uri: req.recipient.profilePictureUrl }}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  marginRight: 12,
                }}
              />
            ) : (
              <InitialsAvatar
                name={req.recipient?.name || req.recipient?.email}
                size={40}
                style={{ marginRight: 12 }}
              />
            )}
            <View
              style={{
                flex: 1,
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <Text style={styles.recipientName}>{req.recipient?.name}</Text>
              <Text style={styles.recipientEmail}>{req.recipient?.email}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.amountLabel}>Amount</Text>
              <Text style={styles.reviewAmount}>${req.amount}</Text>
            </View>
          </View>
          {req.note ? (
            <View style={{ width: "100%", marginTop: 18 }}>
              <Text style={styles.prompt}>Note</Text>
              <Text style={styles.recipientEmail}>{req.note}</Text>
            </View>
          ) : null}
          <TouchableOpacity style={styles.button} onPress={() => setStep(1)}>
            <Text style={styles.buttonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
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
  subtitle: {
    fontSize: 16,
    color: "#888",
    marginBottom: 8,
    textAlign: "center",
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
  backButtonAbsolute: {
    position: "absolute",
    top: 48,
    left: 24,
    zIndex: 10,
  },
  backButtonText: {
    color: "#4F7CFE",
    fontSize: 16,
    fontWeight: "500",
  },
  centeredContainer: {
    flex: 1,
    backgroundColor: "#fafbfc",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  header: {
    fontSize: 18,
    fontWeight: "500",
    color: "#22223A",
  },
  prompt: {
    fontSize: 16,
    color: "#A1A1AA",
    fontWeight: "500",
    marginBottom: 10,
  },
  input: {
    width: "90%",
    height: 40,
    borderColor: "#F1F1F4",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  recipientRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F1F4",
  },
  recipientName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#222",
  },
  recipientEmail: {
    fontSize: 14,
    color: "#888",
  },
  amountLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#222",
  },
  reviewAmount: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#4F7CFE",
  },
});

export default RequestScreen;
