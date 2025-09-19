// components/ReclaimComponent.tsx
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
  providerId: process.env.EXPO_PUBLIC_RECLAIM_PROVIDER_ID ?? "", // fallback if none passed via prop
};

type Status = "idle" | "verifying" | "verification_complete" | "executing" | "complete" | "error";

type Props = {
  providerId?: string; // used to override provider at runtime
  requiredFields?: {
    productName?: string;
    datePurchased?: string;
    orderId?: string;
    orderDetails?: string;
  };
  onVerificationResult?: (result: {
    proof?: any;
    extractedCount?: number | undefined;
    extractedOrders?: any[] | string | undefined;
    rawContext?: any;
  } | null) => void;
};

export default function ReclaimComponent({ providerId, requiredFields, onVerificationResult }: Props) {
  const { client } = useAbstraxionSigningClient();
  const accountApi = useAbstraxionAccount();
  const { data: account, isConnected, login, isConnecting } = accountApi as any;

  const [followers, setFollowers] = useState<number | undefined>(undefined);
  const [count, setCount] = useState<number | undefined>(undefined);
  const [orders, setOrders] = useState<any[] | string | undefined>(undefined);

  const [status, setStatus] = useState<Status>("idle");
  const [loading, setLoading] = useState(false);

  // Query RUM contract if available
  const queryRUMContract = async () => {
    if (!client) return;
    try {
      const queryMsg = { get_value_by_user: { address: account?.bech32Address } };
      const result: string = await client.queryContractSmart(RUM_CONTRACT_ADDRESS, queryMsg);
      const cleanResult = (result ?? "").replace(/"/g, "");
      const parsedResult = parseInt(cleanResult, 10);
      setFollowers(isNaN(parsedResult) ? undefined : parsedResult);
    } catch (error) {
      console.log("Error querying RUM contract:", error);
    }
  };

  useEffect(() => {
    if (client) queryRUMContract();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  const ensureJsonString = (val: any): string => {
    if (typeof val === "string") return val;
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  };

  const parseMaybeStringified = (maybe: any) => {
    if (maybe === undefined || maybe === null) return maybe;
    if (typeof maybe !== "string") return maybe;
    try {
      return JSON.parse(maybe);
    } catch {
      try {
        return JSON.parse(maybe.replace(/\n/g, ""));
      } catch {
        return maybe;
      }
    }
  };

  const normalizeExtracted = (extractedParameters: any) => {
    if (!extractedParameters) return { count: undefined, orders: undefined };

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

    let ordersVal: any = undefined;
    if (extractedParameters.orders !== undefined) {
      const raw = extractedParameters.orders;
      if (raw === "[]") ordersVal = [];
      else if (typeof raw === "string") {
        try {
          ordersVal = JSON.parse(raw);
        } catch {
          ordersVal = raw;
        }
      } else ordersVal = raw;
    } else if (extractedParameters.order_list !== undefined) {
      const raw = extractedParameters.order_list;
      if (typeof raw === "string") {
        try {
          ordersVal = JSON.parse(raw);
        } catch {
          ordersVal = raw;
        }
      } else ordersVal = raw;
    }

    return { count: countVal, orders: ordersVal };
  };

  const validateRequiredFields = (): boolean => {
    if (!requiredFields) return true;
    const { productName, datePurchased, orderId, orderDetails } = requiredFields;
    if (!productName || !datePurchased || !orderId || !orderDetails) {
      Alert.alert("Missing details", "Please fill all product details before starting verification.");
      return false;
    }
    return true;
  };

  const safeStringify = (x: any) => {
    try {
      return JSON.stringify(x, null, 2);
    } catch {
      // fallback to manual inspection of important properties
      try {
        return String(x);
      } catch {
        return "[unserializable]";
      }
    }
  };

  const startVerificationFlow = async () => {
    if (!account?.bech32Address) {
      Alert.alert("Error", "Please connect your wallet first");
      return;
    }
    if (!client) {
      Alert.alert("Error", "Client not found");
      return;
    }

    if (!validateRequiredFields()) return;

    // providerId: prop overrides env fallback
    const usedProviderId = providerId ?? reclaimConfig.providerId;
    if (!usedProviderId) {
      Alert.alert("Configuration error", "No Reclaim provider ID configured for this run.");
      console.error("No providerId provided to ReclaimComponent and no fallback in env.");
      return;
    }

    // Clear previous state
    setFollowers(undefined);
    setCount(undefined);
    setOrders(undefined);
    setLoading(true);
    setStatus("verifying");

    try {
      console.log("Starting Reclaim startVerification with providerId:", usedProviderId);
      const verificationResult = await reclaimVerification.startVerification({
        appId: reclaimConfig.appId,
        secret: reclaimConfig.appSecret,
        providerId: usedProviderId,
      });

      // LOG full raw result
      console.log("==== Raw Reclaim verificationResult ====");
      console.log(safeStringify(verificationResult));

      setStatus("verification_complete");
      setStatus("executing");

      const proof = verificationResult?.proofs?.[0];
      console.log("Proof object:", safeStringify(proof));

      const claimParamsRaw = proof?.claimData?.parameters;
      const claimContextRaw = proof?.claimData?.context;

      console.log("claimData.parameters:", safeStringify(claimParamsRaw));
      console.log("claimData.context:", safeStringify(claimContextRaw));

      const claimInfo = {
        provider: proof?.claimData?.provider,
        parameters: ensureJsonString(claimParamsRaw),
        context: ensureJsonString(claimContextRaw),
      };

      const signedClaim = {
        claim: {
          identifier: proof?.claimData?.identifier,
          owner: proof?.claimData?.owner,
          epoch: proof?.claimData?.epoch,
          timestampS: proof?.claimData?.timestampS,
        },
        signatures: proof?.signatures,
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

      console.log("executeMsg (stringified params/context):", JSON.stringify(executeMsg, null, 2));

      // parse extracted parameters
      const parsedContext = parseMaybeStringified(proof?.claimData?.context);
      const extractedParams =
        parsedContext && parsedContext.extractedParameters
          ? parsedContext.extractedParameters
          : (parsedContext?.context && parsedContext.context.extractedParameters) || undefined;

      const { count: extractedCount, orders: extractedOrders } = normalizeExtracted(extractedParams);

      console.log("Extracted count (component):", extractedCount);
      console.log("Extracted orders (component):", safeStringify(extractedOrders));

      setCount(extractedCount);
      setOrders(extractedOrders);

      setStatus("complete");

      // optional on-chain query
      await queryRUMContract();

      // build normalized orders for parent callback
      let normalizedOrdersArr: any[] | string | undefined = undefined;
      if (Array.isArray(extractedOrders)) {
        normalizedOrdersArr = extractedOrders;
      } else if (typeof extractedOrders === "string") {
        try {
          const parsed = JSON.parse(extractedOrders);
          normalizedOrdersArr = Array.isArray(parsed) ? parsed : extractedOrders;
        } catch {
          normalizedOrdersArr = extractedOrders;
        }
      } else if (extractedOrders && typeof extractedOrders === "object") {
        normalizedOrdersArr = Array.isArray(extractedOrders) ? extractedOrders : [extractedOrders];
      } else {
        normalizedOrdersArr = extractedOrders;
      }

      // send result back to parent
      if (typeof onVerificationResult === "function") {
        onVerificationResult({
          proof,
          extractedCount,
          extractedOrders: normalizedOrdersArr,
          rawContext: parsedContext,
        });
      }

      Alert.alert("Success", "Complete verification flow finished successfully!");
    } catch (error: any) {
      setStatus("error");

      // robust logging for debugging provider-specific issues
      console.error("Error in verification flow (component):", error);
      try {
        console.log("Error (stringified):", safeStringify(error));
      } catch (e) {
        console.log("Could not stringify error.");
      }

      // some provider errors are nested (error.response / error.data) — try to surface them
      try {
        // @ts-ignore
        if (error?.response) console.error("Error.response:", safeStringify(error.response));
      } catch {}

      Alert.alert("Error", error?.message ?? "Verification failed (see console for details)");

      if (typeof onVerificationResult === "function") {
        onVerificationResult(null);
      }
    } finally {
      setLoading(false);
    }
  };

  // logout helpers (unchanged)
  const performLogout = async (): Promise<void> => {
    try {
      if (typeof (accountApi as any).logout === "function") {
        await (accountApi as any).logout();
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
      await (accountApi as any).login?.();
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

  return (
    <View style={styles.container}>
      {!isConnected ? (
        <View style={styles.connectButtonContainer}>
          <TouchableOpacity
            onPress={() => (accountApi as any).login?.()}
            style={[styles.menuButton, styles.fullWidthButton, isConnecting && styles.disabledButton]}
            disabled={isConnecting}
          >
            <Text style={styles.menuButtonText}>{isConnecting ? "Connecting..." : "Connect Wallet"}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <TouchableOpacity style={[styles.primaryButton]} onPress={startVerificationFlow} disabled={loading}>
            <Text style={styles.primaryButtonText}>{loading ? "Processing..." : "Start Verification Flow"}</Text>
          </TouchableOpacity>

          <View style={styles.statusContainer}>
            <Text style={styles.statusTitle}>Status:</Text>
            <Text style={[styles.statusText, { color: status === "complete" ? "#4caf50" : "#cccccc" }]}>{getStatusText()}</Text>
          </View>

          <View style={styles.infoContainer}>
            <Text style={styles.infoTitle}>Verified Count:</Text>
            <Text style={styles.infoText}>{count !== undefined ? String(count) : "—"}</Text>

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

          <View style={styles.row}>
            <TouchableOpacity style={styles.textButton} onPress={logoutAndLogin} disabled={loading}>
              <Text style={styles.textButtonText}>{loading ? "Processing..." : "Switch Account"}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.textButton}
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
              <Text style={styles.textButtonText}>{loading ? "Processing..." : "Sign Out"}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  connectButtonContainer: { width: "100%", paddingHorizontal: 0, alignItems: "center" },
  fullWidthButton: { width: "100%", maxWidth: "100%" },
  menuButton: { padding: 12, borderRadius: 8, backgroundColor: "#ffffff", alignItems: "center", minWidth: 120 },
  menuButtonText: { color: "#000000", fontSize: 16, fontWeight: "600" },
  disabledButton: { opacity: 0.6 },
  primaryButton: { backgroundColor: "#222222", padding: 14, borderRadius: 10, alignItems: "center" },
  primaryButtonText: { color: "#ffffff", fontSize: 16, fontWeight: "600" },
  statusContainer: { backgroundColor: "#111111", padding: 12, borderRadius: 8, borderWidth: 1, borderColor: "#333333" },
  statusTitle: { fontSize: 14, fontWeight: "bold", color: "#ffffff", marginBottom: 4 },
  statusText: { fontSize: 13, fontWeight: "500", color: "#cccccc" },
  infoContainer: { backgroundColor: "#111111", padding: 12, borderRadius: 8, borderWidth: 1, borderColor: "#333333" },
  infoTitle: { fontSize: 14, fontWeight: "bold", color: "#ffffff", marginBottom: 4 },
  infoText: { fontSize: 13, color: "#cccccc" },
  row: { flexDirection: "row", gap: 8, justifyContent: "space-between" },
  textButton: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: "#ddd", backgroundColor: "#fff", minWidth: 140, alignItems: "center" },
  textButtonText: { color: "#000", fontSize: 15, fontWeight: "600" },
});
