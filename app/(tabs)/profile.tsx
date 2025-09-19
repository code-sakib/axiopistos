// ProfileScreen.tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Linking,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAbstraxionAccount } from "@burnt-labs/abstraxion-react-native";
import * as ImagePicker from "expo-image-picker";

import { getApps, initializeApp } from "firebase/app";
import {
    doc,
    getDoc,
    getFirestore,
    onSnapshot,
    serverTimestamp,
    setDoc,
    updateDoc,
} from "firebase/firestore";
import { getDownloadURL, getStorage, ref as storageRef, uploadBytes } from "firebase/storage";

// ---------- Firebase init (keep or use shared firebase.ts) ----------
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? "",
};

let firebaseApp;
if (!getApps().length) {
  firebaseApp = initializeApp(firebaseConfig);
} else {
  firebaseApp = getApps()[0];
}
const db = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);
// ------------------------------------------------------

const DEFAULT_AVATARS = [
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQzIBEdteo9kxmwnX9lCyBwvZpVDKILV-Zfkw&s",
    "https://i.pinimg.com/736x/ea/6b/8d/ea6b8d62081fbe016f80d5440550910e.jpg",
    "https://img.freepik.com/premium-vector/3d-young-man-avatar-happy-smiling-face-young-student-freelancer_313242-1240.jpg",
];
const DEFAULT_NAMES = ["RunWarrior"];

// PayPal business email from env:
const PAYPAL_BUSINESS_EMAIL = process.env.EXPO_PUBLIC_PAYPAL_BUSINESS_EMAIL ?? "";

export default function ProfileScreen() {
  const router = useRouter();

  const accountApi = useAbstraxionAccount();
  const { data: account, isConnected, login, isConnecting, logout } = accountApi as any;

  const [avatar, setAvatar] = useState<string>(DEFAULT_AVATARS[0]);
  const [username, setUsername] = useState<string>(DEFAULT_NAMES[0]);
  const [ordersCount, setOrdersCount] = useState<number>(0);
  const [sellingCount, setSellingCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [userDocExists, setUserDocExists] = useState<boolean | null>(null);

  // CART
  const [cart, setCart] = useState<any[]>([]);
  const [cartLoading, setCartLoading] = useState(false);

  // Edit profile modal (avatar/name)
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState<string>("");
  const [editAvatarLocalUri, setEditAvatarLocalUri] = useState<string | null>(null);
  const [selectedDefaultAvatar, setSelectedDefaultAvatar] = useState<number | null>(null);
  const [savingProfile, setSavingProfile] = useState<boolean>(false);

  const visibleName = account?.profile?.name || account?.name || account?.walletName || username;
  const visibleEmail = account?.profile?.email || account?.email || account?.gmail || null;
  const xionId = account?.bech32Address ?? account?.address ?? account?.id ?? null;

  useEffect(() => {
    if (!isConnected || !xionId) {
      setCart([]);
      setOrdersCount(0);
      setSellingCount(0);
      setUserDocExists(null);
      setAvatar(DEFAULT_AVATARS[0]);
      setUsername(DEFAULT_NAMES[0]);
      return;
    }

    const userRef = doc(db, "users", xionId);
    setCartLoading(true);

    const unsub = onSnapshot(
      userRef,
      (snap) => {
        if (!snap.exists()) {
          // create minimal doc
          setDoc(
            userRef,
            { createdAt: serverTimestamp(), cart: [], orders: [], sellingProducts: [], name: visibleName, avatar: avatar },
            { merge: true }
          ).catch(() => {});
          setCart([]);
          setOrdersCount(0);
          setSellingCount(0);
          setUserDocExists(false);
        } else {
          const data = snap.data() as any;
          setCart(Array.isArray(data?.cart) ? data.cart : []);
          setOrdersCount(Array.isArray(data?.orders) ? data.orders.length : 0);
          setSellingCount(Array.isArray(data?.sellingProducts) ? data.sellingProducts.length : 0);
          if (data?.avatar) setAvatar(data.avatar);
          if (data?.name) setUsername(data.name);
          setUserDocExists(true);
        }
        setCartLoading(false);
      },
      (err) => {
        console.error("onSnapshot user doc error:", err);
        setCartLoading(false);
      }
    );

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, xionId]);

  // remove from cart
  const removeFromCart = async (productId: string) => {
    if (!xionId) {
      Alert.alert("Not connected", "Please login first");
      return;
    }
    try {
      const userRef = doc(db, "users", xionId);
      const snap = await getDoc(userRef);
      if (!snap.exists()) return;
      const data = snap.data() as any;
      const existingCart = Array.isArray(data?.cart) ? data.cart : [];
      const filtered = existingCart.filter((it: any) => it.productId !== productId);
      await updateDoc(userRef, { cart: filtered });
    } catch (err: any) {
      console.error("Remove cart error:", err);
      Alert.alert("Error", "Could not remove item from cart: " + (err?.message ?? err));
    }
  };

  // calculate total
  const calcCartTotal = (cartItems: any[]) => {
    const total = cartItems.reduce((acc, it) => {
      const p = Number(it.price ?? 0);
      return acc + (isNaN(p) ? 0 : p);
    }, 0);
    return total;
  };

  // Place order — create order in user doc, clear cart, open PayPal
  const placeOrderWithPayPal = async () => {
    if (!isConnected || !xionId) {
      Alert.alert("Login required", "Please login to place order.");
      return;
    }
    if (!cart || cart.length === 0) {
      Alert.alert("Cart empty", "Add items to cart before placing order.");
      return;
    }

    const total = calcCartTotal(cart);
    const amount = Number(total.toFixed(2));

    // Create order object
    const orderObj = {
      id: `order_${Date.now()}`,
      createdAt: serverTimestamp(),
      items: cart,
      totalAmount: amount,
      currency: "USD",
      status: "pending_payment",
      paymentProvider: "paypal",
      paymentMeta: {
        paypalBusiness: PAYPAL_BUSINESS_EMAIL,
      },
    };

    try {
      const userRef = doc(db, "users", xionId);
      const snap = await getDoc(userRef);
      let currentOrders: any[] = [];
      if (snap.exists()) {
        const data = snap.data() as any;
        currentOrders = Array.isArray(data?.orders) ? data.orders : [];
      } else {
        // create user doc if missing
        await setDoc(userRef, { createdAt: serverTimestamp() }, { merge: true });
        currentOrders = [];
      }

      // push order locally and clear cart
      const newOrders = [...currentOrders, orderObj];
      await updateDoc(userRef, { orders: newOrders, cart: [] });

      // Build PayPal classic checkout URL (client-side quick flow)
      if (!PAYPAL_BUSINESS_EMAIL) {
        Alert.alert(
          "PayPal not configured",
          "PayPal business email not found in env. Order created as pending_payment. Configure EXPO_PUBLIC_PAYPAL_BUSINESS_EMAIL to enable PayPal checkout."
        );
        return;
      }

      // Create simple PayPal URL (note: for production use server-side orders + webhooks)
      // Using PayPal Standard payment URL:
      const itemNames = cart.map((i) => i.name || i.title || "Item").join(", ");
      const paypalUrl = `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${encodeURIComponent(
        PAYPAL_BUSINESS_EMAIL
      )}&item_name=${encodeURIComponent(itemNames)}&amount=${encodeURIComponent(
        amount.toFixed(2)
      )}&currency_code=USD&no_shipping=1`;

      // open PayPal checkout in browser
      const supported = await Linking.canOpenURL(paypalUrl);
      if (supported) {
        await Linking.openURL(paypalUrl);
        Alert.alert("Order created", "Order created and redirected to PayPal. Order status: pending_payment. (You will need server-side verification for final status.)");
      } else {
        Alert.alert("Open failed", "Could not open PayPal URL. Order created as pending_payment in your orders.");
      }
    } catch (err: any) {
      console.error("Place order error:", err);
      Alert.alert("Error", "Could not place order: " + (err?.message ?? err));
    }
  };

  // Edit profile (avatar + name) helpers (same as before, kept compact)
  const openEditModal = () => {
    setEditName(username);
    setEditAvatarLocalUri(null);
    setSelectedDefaultAvatar(null);
    setEditModalVisible(true);
  };

  const pickImageFromLibrary = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Please grant media library permission to pick an image.");
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [1, 1],
      });
      if (!res.canceled && Array.isArray((res as any).assets) && (res as any).assets.length > 0) {
        const pickedUri = (res as any).assets[0].uri;
        setEditAvatarLocalUri(pickedUri);
        setSelectedDefaultAvatar(null);
      }
    } catch (err: any) {
      console.error("Image pick error:", err);
      Alert.alert("Error", "Could not pick image: " + (err?.message ?? err));
    }
  };

  const saveProfileToCloud = async () => {
    if (!xionId) {
      Alert.alert("Not connected", "Please login first");
      return;
    }
    setSavingProfile(true);
    try {
      const userRef = doc(db, "users", xionId);
      let finalAvatarUrl = avatar;
      if (selectedDefaultAvatar !== null) {
        finalAvatarUrl = DEFAULT_AVATARS[selectedDefaultAvatar];
      }
      if (editAvatarLocalUri) {
        const response = await fetch(editAvatarLocalUri);
        const blob = await response.blob();
        const fileRef = storageRef(storage, `userAvatars/${xionId}_${Date.now()}`);
        await uploadBytes(fileRef, blob as any);
        const downloadUrl = await getDownloadURL(fileRef);
        finalAvatarUrl = downloadUrl;
      }
      const updated = {
        name: editName || visibleName,
        avatar: finalAvatarUrl,
        lastSeen: serverTimestamp(),
      } as any;
      await updateDoc(userRef, updated);
      setUsername(updated.name);
      setAvatar(updated.avatar);
      setEditModalVisible(false);
      Alert.alert("Saved", "Profile saved successfully.");
    } catch (err: any) {
      console.error("Save profile error:", err);
      Alert.alert("Error", "Failed to save profile: " + (err?.message ?? err));
    } finally {
      setSavingProfile(false);
    }
  };

  const onSelectDefaultAvatar = (index: number) => {
    setSelectedDefaultAvatar(index);
    setEditAvatarLocalUri(null);
  };

  const onPrimaryPress = async () => {
    if (!isConnected) {
      try {
        setLoading(true);
        await login();
      } catch (err: any) {
        Alert.alert("Login failed", err?.message ?? "Could not log in");
      } finally {
        setLoading(false);
      }
    } else {
      router.push({ pathname: "/sellingScreen" as any, params: {} });
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      if (typeof logout === "function") {
        await logout();
        Alert.alert("Signed out", "You have been logged out.");
      } else if (typeof (accountApi as any).disconnect === "function") {
        await (accountApi as any).disconnect();
        Alert.alert("Signed out", "You have been logged out.");
      } else {
        Alert.alert("Sign out", "Sign out function not available — please sign out in your wallet/app.");
      }
    } catch (err: any) {
      console.error("Error signing out:", err);
      Alert.alert("Error", err?.message ?? "Sign out failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Profile Header */}
        <View style={styles.card}>
          <Image source={{ uri: isConnected ? avatar : avatar }} style={styles.avatar} />
          <Text style={styles.username}>{isConnected ? username : DEFAULT_NAMES[0]}</Text>

          {isConnected && (
            <Text style={{ color: "#666", marginTop: 6 }}>
              {visibleEmail ?? `ID: ${xionId?.slice?.(0, 12) ?? xionId ?? "—"}`}
            </Text>
          )}

          {isConnected && (
            <TouchableOpacity style={[styles.smallButton]} onPress={openEditModal}>
              <Text style={styles.smallButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* CART SECTION (first) */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Your Cart</Text>
          {cartLoading ? (
            <ActivityIndicator />
          ) : cart.length === 0 ? (
            <Text style={styles.listItem}>Your cart is empty</Text>
          ) : (
            <>
              {cart.map((item: any) => (
                <View key={item.productId} style={{ width: "100%", marginBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <Image source={{ uri: item.image }} style={{ width: 56, height: 56, borderRadius: 8 }} />
                    <View>
                      <Text style={{ fontWeight: "700" }}>{item.name}</Text>
                      <Text style={{ color: "#555" }}>${item.price}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => removeFromCart(item.productId)} style={{ padding: 8 }}>
                    <Ionicons name="trash-sharp" size={18} color="red" />
                  </TouchableOpacity>
                </View>
              ))}

              <View style={{ width: "100%", marginTop: 6 }}>
                <Text style={{ fontWeight: "700", marginBottom: 8 }}>Total: ${calcCartTotal(cart).toFixed(2)}</Text>

                <TouchableOpacity style={[styles.button, { backgroundColor: "#0070ba" }]} onPress={placeOrderWithPayPal}>
                  <Text style={[styles.buttonText]}>Place Order — Pay with PayPal</Text>
                </TouchableOpacity>

                <Text style={{ marginTop: 8, color: "#777", fontSize: 13 }}>
                  Soon blockchain-based payments will be integrated.
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Orders Section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Orders</Text>
          <Text style={styles.listItem}>You have {ordersCount} orders</Text>
        </View>

        {/* PRIMARY BUTTON - Go to selling if signed in, else Login */}
        <TouchableOpacity style={styles.button} onPress={onPrimaryPress} disabled={loading || isConnecting}>
          {loading || isConnecting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{!isConnected ? "Login / Connect" : "Go to Selling Page"}</Text>}
        </TouchableOpacity>

        {/* Selling Section (below button) */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>You want to sell</Text>
          <Text style={styles.listItem}>{sellingCount} products</Text>
        </View>

        {/* About Section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>About Axiopistos</Text>
          <Text style={styles.listItem}>• Verifies purchases from trusted sources</Text>
          <Text style={styles.listItem}>• Uses Reclaim to ensure authenticity</Text>
          <Text style={styles.listItem}>• Leverages zkTLS for private proof</Text>
          <Text style={styles.listItem}>• Prevents fake claims & fraud</Text>
          <Text style={styles.listItem}>• Builds trust in peer-to-peer selling</Text>
        </View>

        {/* App Version */}
        <View style={styles.card}>
          <Text style={styles.version}>App Version 1.0.0</Text>
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={[styles.button, styles.signOut]} onPress={handleSignOut} disabled={!isConnected || loading}>
          <Text style={[styles.buttonText, { color: "#fff" }]}>{isConnected ? "Sign Out" : "Sign Out (Not connected)"}</Text>
        </TouchableOpacity>

        {/* Edit Profile Modal */}
        <Modal visible={editModalVisible} animationType="slide" onRequestClose={() => setEditModalVisible(false)}>
          <SafeAreaView style={{ flex: 1, padding: 16 }}>
            <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 12 }}>Edit Profile</Text>

            <Text style={{ marginBottom: 6 }}>Name</Text>
            <TextInput value={editName} onChangeText={setEditName} placeholder="Your name" style={{ borderWidth: 1, borderColor: "#ddd", padding: 8, borderRadius: 8, marginBottom: 12 }} />

            <Text style={{ marginBottom: 6 }}>Choose avatar</Text>

            <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
              {DEFAULT_AVATARS.map((a, idx) => (
                <TouchableOpacity key={idx} onPress={() => onSelectDefaultAvatar(idx)}>
                  <Image source={{ uri: a }} style={{ width: 72, height: 72, borderRadius: 36, borderWidth: selectedDefaultAvatar === idx ? 3 : 0, borderColor: "#333" }} />
                </TouchableOpacity>
              ))}

              <TouchableOpacity onPress={pickImageFromLibrary} style={{ justifyContent: "center" }}>
                <View style={{ width: 72, height: 72, borderRadius: 36, borderWidth: 1, borderColor: "#ccc", alignItems: "center", justifyContent: "center" }}>
                  <Text>Pick</Text>
                </View>
              </TouchableOpacity>
            </View>

            {editAvatarLocalUri ? (
              <Image source={{ uri: editAvatarLocalUri }} style={{ width: 120, height: 120, borderRadius: 60, marginBottom: 12 }} />
            ) : selectedDefaultAvatar !== null ? (
              <Image source={{ uri: DEFAULT_AVATARS[selectedDefaultAvatar] }} style={{ width: 120, height: 120, borderRadius: 60, marginBottom: 12 }} />
            ) : (
              <Image source={{ uri: avatar }} style={{ width: 120, height: 120, borderRadius: 60, marginBottom: 12 }} />
            )}

            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity style={[styles.button, { flex: 1 }]} onPress={saveProfileToCloud} disabled={savingProfile}>
                {savingProfile ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={[styles.button, { backgroundColor: "#ccc", flex: 1 }]} onPress={() => setEditModalVisible(false)}>
                <Text style={[styles.buttonText, { color: "#000" }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    alignItems: "center",
  },
  avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 10 },
  username: { fontSize: 20, fontWeight: "bold", color: "#222" },
  button: {
    backgroundColor: "#222",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 16,
  },
  buttonText: { fontSize: 16, fontWeight: "600", color: "#fff" },
  smallButton: { marginTop: 10, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: "#eee" },
  smallButtonText: { color: "#333", fontWeight: "600" },
  sectionTitle: { fontSize: 16, fontWeight: "bold", color: "#222", marginBottom: 10 },
  listItem: { fontSize: 14, color: "#555", marginBottom: 5, alignSelf: "flex-start" },
  version: { fontSize: 14, color: "#888", textAlign: "center" },
  signOut: { backgroundColor: "#e63946" },
});
