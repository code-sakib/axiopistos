import {
  useAbstraxionAccount,
  useAbstraxionSigningClient,
} from "@burnt-labs/abstraxion-react-native";
import { ReclaimVerification } from "@reclaimprotocol/inapp-rn-sdk";
import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const reclaimVerification = new ReclaimVerification();

const RUM_CONTRACT_ADDRESS = process.env.EXPO_PUBLIC_RUM_CONTRACT_ADDRESS ?? "";

const reclaimConfig = {
  appId: process.env.EXPO_PUBLIC_RECLAIM_APP_ID ?? "",
  appSecret: process.env.EXPO_PUBLIC_RECLAIM_APP_SECRET ?? "",
  providerId: process.env.EXPO_PUBLIC_RECLAIM_PROVIDER_ID ?? "",
};

type Status =
  | "idle"
  | "verifying"
  | "verification_complete"
  | "executing"
  | "complete"
  | "error";

type Props = {
  // requiredFields are provided by parent (SellingScreen)
  requiredFields?: {
    productName?: string;
    datePurchased?: string;
    orderId?: string;
    orderDetails?: string;
  };
  // callback after verification finishes (success or failure) - returns parsed proof & extracted
  onVerificationResult?: (result: {
    proof?: any;
    extractedCount?: number | undefined;
    extractedOrders?: any[] | string | undefined;
    rawContext?: any;
  }) => void;
};

export default function ReclaimComponent({ requiredFields, onVerificationResult }: Props) {
  const { client } = useAbstraxionSigningClient();
  const accountApi = useAbstraxionAccount();
  const { data: account, isConnected, login, isConnecting } = accountApi;

  // --- new states ---
  const [followers, setFollowers] = useState<number | undefined>(undefined); // from contract query (if used)
  const [count, setCount] = useState<number | undefined>(undefined); // extracted from proof context
  const [orders, setOrders] = useState<any[] | string | undefined>(undefined); // extracted orders (array or raw)
  // ------------------

  const [status, setStatus] = useState<Status>("idle");
  const [loading, setLoading] = useState(false);

  // query optional RUM contract (same as earlier)
  const queryRUMContract = async () => {
    if (!client) {
      console.log("Client not available for query");
      return;
    }

    try {
      const queryMsg = {
        get_value_by_user: {
          address: account?.bech32Address,
        },
      };

      const result: string = await client.queryContractSmart(
        RUM_CONTRACT_ADDRESS,
        queryMsg
      );

      // Parse the string result to number (contract returns a quoted number)
      const cleanResult = (result ?? "").replace(/"/g, ""); // Remove quotes
      const parsedResult = parseInt(cleanResult, 10);
      setFollowers(isNaN(parsedResult) ? undefined : parsedResult);
    } catch (error) {
      console.log("Error querying RUM contract:", error);
      // don't throw UI alert here
    }
  };

  // Query on mount when client is available
  useEffect(() => {
    if (client) {
      queryRUMContract();
    }
  }, [client]);

  // helper: ensure value is JSON string (for contract params)
  const ensureJsonString = (val: any): string => {
    if (typeof val === "string") return val;
    try {
      return JSON.stringify(val);
    } catch (e) {
      return String(val);
    }
  };

  // helper: safely parse possibly-stringified JSON, return object or original
  const parseMaybeStringified = (maybe: any) => {
    if (maybe === undefined || maybe === null) return maybe;
    if (typeof maybe !== "string") return maybe;
    try {
      return JSON.parse(maybe);
    } catch (e) {
      // sometimes Reclaim returns pretty-printed strings with newlines — still parse
      try {
        // remove newlines and attempt parse again
        return JSON.parse(maybe.replace(/\n/g, ""));
      } catch {
        return maybe;
      }
    }
  };

  // helper to normalize orders/count extracted values
  const normalizeExtracted = (extractedParameters: any) => {
    if (!extractedParameters) return { count: undefined, orders: undefined };

    // count: could be numeric string -> convert to number
    let countVal: number | undefined = undefined;
    if (extractedParameters.count !== undefined) {
      const c = extractedParameters.count;
      const n = Number(c);
      countVal = Number.isNaN(n) ? undefined : n;
    } else if (extractedParameters.order_count !== undefined) {
      const n = Number(extractedParameters.order_count);
      countVal = Number.isNaN(n) ? undefined : n;
    } else if (extractedParameters.followers_count !== undefined) {
      const n = Number(extractedParameters.followers_count);
      countVal = Number.isNaN(n) ? undefined : n;
    }

    // orders: could be "[]" string, or stringified JSON array, or actual array/object
    let ordersVal: any = undefined;
    if (extractedParameters.orders !== undefined) {
      const raw = extractedParameters.orders;

      if (raw === "[]") {
        ordersVal = [];
      } else if (typeof raw === "string") {
        try {
          ordersVal = JSON.parse(raw);
        } catch {
          ordersVal = raw;
        }
      } else {
        ordersVal = raw;
      }
    } else if (extractedParameters.order_list !== undefined) {
      // alternate key
      const raw = extractedParameters.order_list;
      if (typeof raw === "string") {
        try {
          ordersVal = JSON.parse(raw);
        } catch {
          ordersVal = raw;
        }
      } else {
        ordersVal = raw;
      }
    }

    return { count: countVal, orders: ordersVal };
  };

  // Validate required fields are present (called before starting verification)
  const validateRequiredFields = (): boolean => {
    if (!requiredFields) return true; // parent didn't pass restrictions
    const { productName, datePurchased, orderId, orderDetails } = requiredFields;
    if (!productName || !datePurchased || !orderId || !orderDetails) {
      Alert.alert("Missing details", "Please fill all product details before starting verification.");
      return false;
    }
    return true;
  };

  const startVerificationFlow = async () => {
    // first validate wallet / account
    if (!account?.bech32Address) {
      Alert.alert("Error", "Please connect your wallet first");
      return;
    }
    if (!client) {
      Alert.alert("Error", "Client not found");
      return;
    }

    // ensure parent-provided fields are filled
    if (!validateRequiredFields()) {
      return;
    }

    // Clear previous state so stale values don't show
    setFollowers(undefined);
    setCount(undefined);
    setOrders(undefined);

    setLoading(true);
    setStatus("verifying");

    try {
      // Step 1: Verify with Reclaim
      const verificationResult = await reclaimVerification.startVerification({
        appId: reclaimConfig.appId,
        secret: reclaimConfig.appSecret,
        providerId: reclaimConfig.providerId,
      });

      console.log("Verification result:", verificationResult);
      setStatus("verification_complete");

      // Step 2: Execute RUM contract (you already create executeMsg; keep existing contract logic)
      setStatus("executing");

      const proof = verificationResult.proofs[0];

      // Build claimInfo as stringified params/context (matching contract expectation)
      const claimInfo = {
        provider: proof.claimData.provider,
        parameters: ensureJsonString(proof.claimData.parameters),
        context: ensureJsonString(proof.claimData.context),
      };

      const signedClaim = {
        claim: {
          identifier: proof.claimData.identifier,
          owner: proof.claimData.owner,
          epoch: proof.claimData.epoch,
          timestampS: proof.claimData.timestampS,
        },
        signatures: proof.signatures,
      };

      const executeMsg = {
        update: {
          value: {
            proof: {
              claimInfo,
              signedClaim,
            },
          },
        },
      };

      console.log(
        "executeMsg (stringified params/context):",
        JSON.stringify(executeMsg, null, 2)
      );

      // --- Extract orders/count from Reclaim proof context and set UI state ---
      // proof.claimData.context might be stringified JSON or object; parse safely
      const parsedContext = parseMaybeStringified(proof.claimData.context);
      const extractedParams =
        parsedContext && parsedContext.extractedParameters
          ? parsedContext.extractedParameters
          : // sometimes Reclaim returns the extracted parameters nested differently:
            (parsedContext?.context && parsedContext.context.extractedParameters) ||
            undefined;

      const { count: extractedCount, orders: extractedOrders } =
        normalizeExtracted(extractedParams);

      console.log("Extracted count:", extractedCount);
      console.log("Extracted orders:", extractedOrders);

      setCount(extractedCount);
      setOrders(extractedOrders);

      setStatus("complete");

      // Optional: query the RUM contract if you still want the on-chain followers value
      await queryRUMContract();
      
      // Deliver normalized result back to parent
      if (typeof onVerificationResult === "function") {
        // normalize orders to array if possible
        let normalizedOrdersArr: any[] | string | undefined = undefined;
        if (Array.isArray(extractedOrders)) {
          normalizedOrdersArr = extractedOrders;
        } else if (typeof extractedOrders === "string") {
          // if it's a raw string attempt parse into array, otherwise give raw
          try {
            const parsed = JSON.parse(extractedOrders);
            normalizedOrdersArr = Array.isArray(parsed) ? parsed : extractedOrders;
          } catch {
            normalizedOrdersArr = extractedOrders;
          }
        } else if (extractedOrders && typeof extractedOrders === "object") {
          // maybe single order object or map
          normalizedOrdersArr = Array.isArray(extractedOrders)
            ? extractedOrders
            : [extractedOrders];
        } else {
          normalizedOrdersArr = extractedOrders;
        }

        onVerificationResult({
          proof,
          extractedCount,
          extractedOrders: normalizedOrdersArr,
          rawContext: parsedContext,
        });
      }

      Alert.alert("Success", "Complete verification flow finished successfully!");
    } catch (error) {
      console.log("Error in verification flow:", error);
      setStatus("error");

      if (error instanceof ReclaimVerification.ReclaimVerificationException) {
        switch (error.type) {
          case ReclaimVerification.ExceptionType.Cancelled:
            Alert.alert("Cancelled", "Verification was cancelled");
            break;
          case ReclaimVerification.ExceptionType.Dismissed:
            Alert.alert("Dismissed", "Verification was dismissed");
            break;
          case ReclaimVerification.ExceptionType.SessionExpired:
            Alert.alert("Expired", "Verification session expired");
            break;
          case ReclaimVerification.ExceptionType.Failed:
          default:
            Alert.alert("Failed", "Verification failed");
        }
      } else {
        Alert.alert(
          "Error",
          error instanceof Error ? error.message : "An unknown error occurred during the verification flow"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // logout helpers (as before)
  const performLogout = async (): Promise<void> => {
    try {
      if (typeof (accountApi as any).logout === "function") {
        await (accountApi as any).logout();
        // clear UI state when logged out
        setFollowers(undefined);
        setCount(undefined);
        setOrders(undefined);
        setStatus("idle");
        return;
      }
      if (typeof (accountApi as any).disconnect === "function") {
        await (accountApi as any).disconnect();
        setFollowers(undefined);
        setCount(undefined);
        setOrders(undefined);
        setStatus("idle");
        return;
      }
      if (client && typeof (client as any).disconnect === "function") {
        await (client as any).disconnect();
        setFollowers(undefined);
        setCount(undefined);
        setOrders(undefined);
        setStatus("idle");
        return;
      }
      // fallback
      setFollowers(undefined);
      setCount(undefined);
      setOrders(undefined);
      setStatus("idle");
      Alert.alert("Signed out", "Please switch accounts in your wallet app and press Sign In again.");
    } catch (err) {
      console.error("Error while trying to log out:", err);
      throw err;
    }
  };

  const logoutAndLogin = async () => {
    setLoading(true);
    try {
      await performLogout();
      await new Promise((r) => setTimeout(r, 500));
      await login();
    } catch (err: any) {
      Alert.alert("Logout failed", err?.message ?? "Unknown error while logging out");
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "idle":
        return "Ready to start verification";
      case "verifying":
        return "Verifying with Reclaim Protocol...";
      case "verification_complete":
        return "✓ Verification completed";
      case "executing":
        return "Executing RUM contract...";
      case "complete":
        return "✓ Complete verification flow finished!";
      case "error":
        return "❌ Error occurred";
      default:
        return "Unknown status";
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "idle":
        return "#cccccc";
      case "verifying":
      case "executing":
        return "#ffaa00";
      case "verification_complete":
      case "complete":
        return "#4caf50";
      case "error":
        return "#ff4444";
      default:
        return "#cccccc";
    }
  };

  const isButtonDisabled = () => {
    return loading || status === "complete";
  };

  const getButtonText = () => {
    if (loading) {
      return "Processing...";
    }
    if (status === "complete") {
      return "Verification Complete";
    }
    if (status === "error") {
      return "Retry Verification";
    }
    return "Start Verification Flow";
  };

  return (
    <View style={styles.container}>
      {!isConnected ? (
        <View style={styles.connectButtonContainer}>
          <TouchableOpacity
            onPress={login}
            style={[
              styles.menuButton,
              styles.fullWidthButton,
              isConnecting && styles.disabledButton,
            ]}
            disabled={isConnecting}
          >
            <Text style={styles.menuButtonText}>
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <TouchableOpacity
            style={[styles.primaryButton, isButtonDisabled() && styles.disabledButton]}
            onPress={startVerificationFlow}
            disabled={isButtonDisabled()}
          >
            <Text style={styles.primaryButtonText}>{getButtonText()}</Text>
          </TouchableOpacity>

          <View style={styles.statusContainer}>
            <Text style={styles.statusTitle}>Status:</Text>
            <Text style={[styles.statusText, { color: getStatusColor() }]}>
              {getStatusText()}
            </Text>
          </View>

          {/* --- show extracted orders & count (preferred) --- */}
          <View style={styles.infoContainer}>
            <Text style={styles.infoTitle}>Verified Count:</Text>
            <Text style={styles.infoText}>
              {count !== undefined ? String(count) : "—"}
            </Text>

            <Text style={[styles.infoTitle, { marginTop: 8 }]}>Verified Orders:</Text>
            {orders === undefined ? (
              <Text style={styles.infoText}>—</Text>
            ) : typeof orders === "string" ? (
              <Text style={styles.infoText}>{orders}</Text>
            ) : Array.isArray(orders) ? (
              orders.length === 0 ? (
                <Text style={styles.infoText}>No orders found</Text>
              ) : (
                orders.map((o, idx) => (
                  <View key={idx} style={{ marginBottom: 8 }}>
                    <Text style={styles.infoText}>• Order ID: {o.orderId ?? o.id ?? "—"}</Text>
                    <Text style={styles.infoText}>  Name: {o.name ?? o.product ?? "—"}</Text>
                    <Text style={styles.infoText}>  Date: {o.date_purchased ?? o.date ?? "—"}</Text>
                    <Text style={styles.infoText}>  Details: {o.details ?? o.orderDetails ?? "—"}</Text>
                  </View>
                ))
              )
            ) : (
              <Text style={styles.infoText}>{JSON.stringify(orders)}</Text>
            )}
          </View>

          {/* Sign out / switch buttons */}
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.textButton]}
              onPress={logoutAndLogin}
              disabled={loading}
            >
              <Text style={styles.textButtonText}>
                {loading ? "Processing..." : "Switch Account"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.textButton]}
              onPress={async () => {
                setLoading(true);
                try {
                  await performLogout();
                  Alert.alert("Signed out", "You have been signed out.");
                } catch (err: any) {
                  Alert.alert("Error", err?.message ?? "Sign out failed");
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
            >
              <Text style={styles.textButtonText}>
                {loading ? "Processing..." : "Sign Out"}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  connectButtonContainer: {
    width: "100%",
    paddingHorizontal: 0,
    alignItems: "center",
  },
  fullWidthButton: {
    width: "100%",
    maxWidth: "100%",
  },
  menuButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    alignItems: "center",
    minWidth: 120,
  },
  menuButtonText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryButton: {
    backgroundColor: "#222222",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  statusContainer: {
    backgroundColor: "#111111",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333333",
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#cccccc",
  },
  infoContainer: {
    backgroundColor: "#111111",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333333",
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: "#cccccc",
  },
  row: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  textButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
    minWidth: 140,
    alignItems: "center",
  },
  textButtonText: {
    color: "#000",
    fontSize: 15,
    fontWeight: "600",
  },
});
