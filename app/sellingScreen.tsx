// screens/SellingScreen.tsx
import { Ionicons } from "@expo/vector-icons";

import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    Alert,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import 'react-native-get-random-values';
import "react-native-quick-crypto";
import { SafeAreaView } from "react-native-safe-area-context";
import ReclaimComponent from "../components/ReclaimComponent";




const DROPDOWN_ITEMS = [
  { key: "Rare-T", label: "Rare-T", disabled: false },
  { key: "PepperStore", label: "PepperStore (coming soon)", disabled: true },
];

export default function SellingScreen() {
  // Required fields:
  const [productName, setProductName] = useState("");
  const [datePurchased, setDatePurchased] = useState("");
  const [orderId, setOrderId] = useState("");
  const [orderDetails, setOrderDetails] = useState("");
  const [verified, setVerified] = useState(false);

  // image state
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);

  // custom dropdown state
  const [selectedSource, setSelectedSource] = useState<string>("rareT");
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const router = useRouter();

  const validateForm = (): boolean => {
    if (
      !productName.trim() ||
      !datePurchased.trim() ||
      !orderId.trim() ||
      !orderDetails.trim()
    ) {
      Alert.alert("Error", "Please fill in all product details first.");
      return false;
    }
    return true;
  };

  const onSellPressed = () => {
    if (!validateForm()) return;
    Alert.alert(
      "Verify Product",
      "Now verify your ownership before selling. Scroll down to start Reclaim verification."
    );
  };

  const normalizeDateForCompare = (d: string) => {
    if (!d) return "";
    const trimmed = d.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
    if (/^\d{2}[\/ -]\d{2}[\/ -]\d{4}$/.test(trimmed)) {
      const parts = trimmed.split(/[\/ -]/);
      return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    }
    return trimmed;
  };

  const handleVerificationResult = (data: any) => {
    try {
      if (!data) {
        Alert.alert("Verification Failed", "No verification data provided.");
        return;
      }

      const extractedCount = data.extractedCount ?? 0;
      const extractedOrders = data.extractedOrders;

      if (!extractedCount || extractedCount === 0) {
        Alert.alert("No orders", "Order count is zero — you have no orders to verify.");
        return;
      }

      let ordersArr: any[] = [];
      if (Array.isArray(extractedOrders)) {
        ordersArr = extractedOrders;
      } else if (typeof extractedOrders === "string") {
        try {
          const parsed = JSON.parse(extractedOrders);
          ordersArr = Array.isArray(parsed) ? parsed : [];
        } catch {
          ordersArr = [];
        }
      } else if (extractedOrders && typeof extractedOrders === "object") {
        ordersArr = [extractedOrders];
      }

      if (!ordersArr.length) {
        Alert.alert("Verification Failed", "No order data found in verification.");
        return;
      }

      const normalizedProductName = productName.trim().toLowerCase();
      const normalizedDatePurchased = normalizeDateForCompare(datePurchased);
      const normalizedOrderId = orderId.trim();

      const matchingOrder = ordersArr.find((o) => {
        const oid = (o.orderId ?? o.id ?? o.order_id ?? "").toString();
        const nameVal = (o.name ?? o.product ?? o.title ?? "")
          .toString()
          .trim()
          .toLowerCase();
        const dateVal = (o.date_purchased ?? o.date ?? o.purchase_date ?? "").toString();
        const normalizedOrderDate = normalizeDateForCompare(dateVal);

        const idMatch = oid === normalizedOrderId;
        const nameMatch = normalizedProductName ? nameVal === normalizedProductName : true;
        const dateMatch = normalizedDatePurchased
          ? normalizedOrderDate === normalizedDatePurchased
          : true;

        return idMatch && nameMatch && dateMatch;
      });

      if (!matchingOrder) {
        Alert.alert(
          "Verification Failed",
          "Order details do not match the verified ownership."
        );
        return;
      }

      setVerified(true);
      Alert.alert(
        "Verified ✅",
        `Product is verified and ready to be listed! (Order ID: ${matchingOrder.orderId ?? matchingOrder.id})`
      );
    } catch (err) {
      console.error("Verification Error:", err);
      Alert.alert("Error", "Something went wrong during verification. Please try again.");
    }
  };

  const openDropdown = () => setDropdownVisible(true);
  const closeDropdown = () => setDropdownVisible(false);

  const onSelectItem = (item: { key: string; label: string; disabled?: boolean }) => {
    if (item.disabled) {
      Alert.alert("Coming soon", `${item.label} will be available soon.`);
      return;
    }
    setSelectedSource(item.key);
    closeDropdown();
  };

  const selectedLabel =
    DROPDOWN_ITEMS.find((i) => i.key === selectedSource)?.label ?? "Select source";

  // Image picker helper
  const pickImage = async () => {
    try {
      // Request permission (only needed on native platforms)
    //   if (Platform.OS !== "web") {
    //     const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    //     if (status !== "granted") {
    //       Alert.alert("Permission required", "Permission to access media library is required!");
    //       return;
    //     }
    //   }

    //   const result = await ImagePicker.launchImageLibraryAsync({
    //     mediaTypes: 'images',       // or ['images']
    //     allowsEditing: true,
    //     aspect: [4, 3],
    //     quality: 0.7,
    //   });

    //   if (!result.canceled) {
    //     // expo-image-picker v13+ returns { assets: [{ uri }] } on some versions; handle both
    //     // @ts-ignore
    //     const uri = result.assets ? result.assets[0].uri : (result as any).uri;
    //     setImageUri(uri);
    //   }
    } catch (err) {
      console.error("Image pick error:", err);
      Alert.alert("Error", "Could not pick the image. Try again.");
    }
  };

  const removeImage = () => setImageUri(null);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
      {/* Back Button */}
      <View style={localStyles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={localStyles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#000" />
        </TouchableOpacity>
        <Text style={localStyles.headerTitle}>Sell Item</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Product Info */}
          <View style={styles.card}>
            <Text style={styles.title}>Sell a Product</Text>

            {/* Image upload area (new) */}
            <View style={styles.imageUploadContainer}>
              <Text style={styles.imageLabel}>Product image (optional)</Text>

              <TouchableOpacity
                style={styles.imageBox}
                onPress={pickImage}
                activeOpacity={0.8}
              >
                {imageUri ? (
                  <View style={{ width: "100%" }}>
                    <Image source={{ uri: imageUri }} style={styles.previewImage} />
                    <TouchableOpacity style={styles.removeImageBtn} onPress={removeImage}>
                      <Text style={styles.removeImageText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.imagePlaceholderRow}>
                    <Ionicons name="camera" size={20} color="#666" />
                    <Text style={styles.imagePlaceholderText}>Tap to upload image</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <TextInput style={styles.input} placeholder="Product Name" value={productName} onChangeText={setProductName} />

            <TextInput
              style={styles.input}
              placeholder="Date Purchased"
              value={datePurchased}
              onChangeText={setDatePurchased}
            />

            <TextInput style={styles.input} placeholder="Order ID" value={orderId} onChangeText={setOrderId} />

            <TextInput
              style={[styles.input, { height: 100 }]}
              placeholder="Order Details (Why it is an collectible?)"
              value={orderDetails}
              onChangeText={setOrderDetails}
              multiline
            />

            {/* Custom dropdown */}
            <View style={styles.dropdownContainer}>
              <Text style={styles.dropdownLabel}>Verify purchase from</Text>

              <TouchableOpacity style={styles.dropdownButton} onPress={openDropdown} activeOpacity={0.8}>
                <Text style={styles.dropdownButtonText} numberOfLines={1}>
                  {selectedLabel}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#333" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={onSellPressed}>
              <Text style={styles.primaryButtonText}>Continue to Verify</Text>
            </TouchableOpacity>

            <View style={{ marginTop: 10 }}>
              <Text style={{ color: verified ? "#2ecc71" : "#777" }}>{verified ? "Product verified — ready to list" : "Not verified yet"}</Text>
            </View>
          </View>

          {/* Reclaim Flow Component */}
          <View style={styles.card}>
            <Text style={styles.subtitle}>Verify Ownership</Text>

            <ReclaimComponent
              
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal for dropdown */}
      <Modal visible={dropdownVisible} transparent animationType="fade" onRequestClose={closeDropdown}>
        <TouchableWithoutFeedback onPress={closeDropdown}>
          <View style={modalStyles.backdrop} />
        </TouchableWithoutFeedback>

        <View style={modalStyles.centered}>
          <View style={modalStyles.sheet}>
            {DROPDOWN_ITEMS.map((it) => (
              <TouchableOpacity
                key={it.key}
                onPress={() => onSelectItem(it)}
                style={[modalStyles.item, it.disabled && modalStyles.itemDisabled]}
                activeOpacity={it.disabled ? 0.6 : 0.8}
                disabled={false}
              >
                <Text style={[modalStyles.itemText, it.disabled && modalStyles.itemTextDisabled]}>{it.label}</Text>
                {selectedSource === it.key && !it.disabled ? (
                  <Ionicons name="checkmark" size={18} color="#1b7a3a" />
                ) : null}
              </TouchableOpacity>
            ))}

            <TouchableOpacity onPress={closeDropdown} style={modalStyles.cancelBtn}>
              <Text style={modalStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  headerRow: {
    paddingTop: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f5f5f5",
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 6,
  },
});

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#222",
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
    color: "#444",
  },
  input: {
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  dropdownContainer: {
    marginBottom: 12,
  },
  dropdownLabel: {
    fontSize: 13,
    color: "#444",
    marginBottom: 6,
    fontWeight: "600",
  },
  dropdownButton: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownButtonText: {
    fontSize: 14,
    color: "#222",
    flex: 1,
    marginRight: 8,
  },
  primaryButton: {
    backgroundColor: "#222",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 6,
  },
  primaryButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },

  /* image upload styles */
  imageUploadContainer: {
    marginBottom: 12,
  },
  imageLabel: {
    fontSize: 13,
    color: "#444",
    marginBottom: 8,
    fontWeight: "600",
  },
  imageBox: {
    borderWidth: 1,
    borderColor: "#e3e3e3",
    borderStyle: "dashed",
    borderRadius: 10,
    padding: 12,
    minHeight: 90,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fafafa",
  },
  imagePlaceholderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  imagePlaceholderText: {
    marginLeft: 8,
    color: "#666",
  },
  previewImage: {
    width: "100%",
    height: 180,
    borderRadius: 8,
    resizeMode: "cover",
  },
  removeImageBtn: {
    marginTop: 8,
    alignSelf: "flex-end",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  removeImageText: {
    color: "#e74c3c",
    fontWeight: "600",
  },
});

/* Modal styles */
const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "#00000066",
  },
  centered: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 40,
  },
  sheet: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 8,
    overflow: "hidden",
  },
  item: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemDisabled: {
    backgroundColor: "#fafafa",
  },
  itemText: {
    fontSize: 15,
    color: "#111",
  },
  itemTextDisabled: {
    color: "#999",
  },
  cancelBtn: {
    padding: 14,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  cancelText: {
    fontSize: 15,
    color: "#444",
    fontWeight: "600",
  },
});
