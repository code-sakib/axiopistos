// screens/SellingScreen.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ReclaimComponent from "../components/ReclaimComponent";

// PROVIDER LABELS (friendly names). The actual GUIDs are read from env below.
const PROVIDER_LABELS = [
  { key: "1", label: "Rare-T" },
  { key: "2", label: "PepperStore" },
  { key: "3", label: "BlueBalloonToys" },
];

// Read provider GUIDs from env. Set these in your .env as shown below.
const PROVIDER_ID_BY_KEY: Record<string, string | undefined> = {
  "1": process.env.EXPO_PUBLIC_RECLAIM_PROVIDER_1 ?? undefined,
  "2": process.env.EXPO_PUBLIC_RECLAIM_PROVIDER_2 ?? undefined,
  "3": process.env.EXPO_PUBLIC_RECLAIM_PROVIDER_3 ?? undefined,
};

export default function SellingScreen() {
  const router = useRouter();

  // provider selection uses keys "1","2","3" (friendly). The actual GUID is read from env mapping.
  const [selectedProviderKey, setSelectedProviderKey] = useState<string>("1");
  const [providerDropdownVisible, setProviderDropdownVisible] = useState(false);
  const [verified, setVerified] = useState(false);

  const openProviderDropdown = () => setProviderDropdownVisible(true);
  const closeProviderDropdown = () => setProviderDropdownVisible(false);

  const onSelectProvider = (key: string) => {
    setSelectedProviderKey(key);
    closeProviderDropdown();
  };

  const selectedProviderLabel =
    PROVIDER_LABELS.find((p) => p.key === selectedProviderKey)?.label ?? "Select provider";

  // This function returns the actual GUID to send to Reclaim, read from env mapping
  const getSelectedProviderId = (): string | undefined => {
    return PROVIDER_ID_BY_KEY[selectedProviderKey];
  };

  // Called when ReclaimComponent returns results
  const handleVerificationResult = (res: any | null) => {
    console.log("SellingScreen received onVerificationResult:", res);
    if (!res) {
      console.log("Verification failed or returned null.");
      setVerified(false);
      return;
    }
    console.log("extractedOrders (parent):", res.extractedOrders);
    if (res.extractedCount && res.extractedCount > 0) {
      setVerified(true);
      Alert.alert("Verified", `Verification returned ${res.extractedCount} items — check console for details.`);
    } else {
      setVerified(false);
      Alert.alert("Verification finished", "No verified orders returned — check console for details.");
    }
  };

  // When user presses Continue, show an alert with provider name + key + GUID (if configured)
  const onContinuePress = () => {
    const providerId = getSelectedProviderId();
    if (!providerId) {
      Alert.alert(
        "Provider not configured",
        `Selected provider '${selectedProviderLabel}' (key: ${selectedProviderKey}) has no provider GUID configured in .env.`
      );
      return;
    }

    Alert.alert(
      "Start verification?",
      `Provider: ${selectedProviderLabel}\nKey: ${selectedProviderKey}\nProvider GUID: ${providerId}\n\nPress 'Start' to open the Reclaim flow below.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Start",
          onPress: () => {
            // We don't auto-trigger the internal Reclaim start here (component has its own Start button).
            // But we show this alert so the user knows the provider name & key selected.
            // The ReclaimComponent will use the same provider GUID (passed as prop).
            Alert.alert("Ready", `Reclaim will use ${selectedProviderLabel} (key: ${selectedProviderKey}). Scroll down and press 'Start Verification Flow'.`);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
      <View style={localStyles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={localStyles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#000" />
        </TouchableOpacity>
        <Text style={localStyles.headerTitle}>Verify Ownership</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <View style={styles.card}>
            <Text style={styles.title}>Choose Reclaim Provider</Text>

            <Text style={[styles.label, { marginTop: 12 }]}>Select Reclaim Provider</Text>
            <TouchableOpacity style={styles.dropdownButton} onPress={openProviderDropdown}>
              <Text style={styles.dropdownButtonText}>{selectedProviderLabel}</Text>
              <Ionicons name="chevron-down" size={18} color="#333" />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.primaryButton, { marginTop: 16 }]} onPress={onContinuePress}>
              <Text style={styles.primaryButtonText}>Continue to Reclaim (below)</Text>
            </TouchableOpacity>

            <View style={{ marginTop: 10 }}>
              <Text style={{ color: verified ? "#2ecc71" : "#777" }}>
                {verified ? "Last run: verified — check console for details" : "Not verified yet (run Reclaim below)"}
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.subtitle}>Reclaim Flow</Text>

            {/* PASS the provider GUID read from env into ReclaimComponent */}
            <ReclaimComponent
              providerId={getSelectedProviderId()}
              onVerificationResult={(r) => {
                console.log("ReclaimComponent -> SellingScreen (callback):", r);
                // also log orders explicitly
                console.log("ReclaimComponent extractedOrders:", r?.extractedOrders ?? "none");
                handleVerificationResult(r);
              }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Provider dropdown */}
      <Modal visible={providerDropdownVisible} transparent animationType="fade" onRequestClose={closeProviderDropdown}>
        <TouchableWithoutFeedback onPress={closeProviderDropdown}>
          <View style={modalStyles.backdrop} />
        </TouchableWithoutFeedback>
        <View style={modalStyles.centered}>
          <View style={modalStyles.sheet}>
            {PROVIDER_LABELS.map((it) => (
              <TouchableOpacity key={it.key} onPress={() => onSelectProvider(it.key)} style={modalStyles.item}>
                <Text style={modalStyles.itemText}>{it.label}</Text>
                {selectedProviderKey === it.key ? <Ionicons name="checkmark" size={18} color="#1b7a3a" /> : null}
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={closeProviderDropdown} style={modalStyles.cancelBtn}>
              <Text style={modalStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* styles (same as before) */
const localStyles = StyleSheet.create({
  headerRow: { paddingTop: 12, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#f5f5f5" },
  backBtn: { padding: 6 },
  headerTitle: { fontSize: 18, fontWeight: "600", marginLeft: 6 },
});
const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 12, color: "#222" },
  subtitle: { fontSize: 16, fontWeight: "600", marginBottom: 10, color: "#444" },
  label: { fontSize: 13, color: "#444", marginBottom: 6, fontWeight: "600" },
  dropdownButton: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, backgroundColor: "#fff", paddingHorizontal: 12, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dropdownButtonText: { fontSize: 14, color: "#222", flex: 1, marginRight: 8 },
  primaryButton: { backgroundColor: "#222", padding: 14, borderRadius: 10, alignItems: "center" },
  primaryButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
const modalStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "#00000066" },
  centered: { position: "absolute", left: 16, right: 16, bottom: 40 },
  sheet: { backgroundColor: "#fff", borderRadius: 12, paddingVertical: 8, overflow: "hidden" },
  item: { paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  itemText: { fontSize: 15, color: "#111" },
  cancelBtn: { padding: 14, alignItems: "center", borderTopWidth: 1, borderTopColor: "#eee" },
  cancelText: { fontSize: 15, color: "#444", fontWeight: "600" },
});
