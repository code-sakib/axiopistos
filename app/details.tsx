import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Reclaim / Abstraxion hooks to get logged-in account
import { useAbstraxionAccount } from "@burnt-labs/abstraxion-react-native";

// Firebase
import { getApps, initializeApp } from "firebase/app";
import {
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

// ---------- Firebase init (duplicate-safe) ----------
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
// ----------------------------------------------------

export default function DetailsScreen() {
  const { product: productString } = useLocalSearchParams();
  const router = useRouter();
  const [added, setAdded] = useState(false); // track add-to-cart state

  // account
  const accountApi = useAbstraxionAccount() as any;
  const { data: account, isConnected } = accountApi ?? {};
  const xionId = account?.bech32Address ?? account?.address ?? account?.id ?? null;

  if (!productString) {
    return <Text>No product data available.</Text>;
  }

  const product = JSON.parse(productString as string);

  const verificationSource =
    Array.isArray(product.verificationBadges) && product.verificationBadges.length > 0
      ? product.verificationBadges[0]
      : null;

  const getInitials = (name?: string) => {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return (parts[0].slice(0, 1) + parts[1].slice(0, 1)).toUpperCase();
  };

  // derive stable productId for dedupe
  const productId =
    product.id ?? product._id ?? product.productId ?? `${product.name}-${product.price}`;

  const addToCart = async () => {
    if (!isConnected || !xionId) {
      Alert.alert("Login required", "Please login from your profile to add items to cart.");
      return;
    }

    try {
      // read user doc
      const userRef = doc(db, "users", xionId);
      const snap = await getDoc(userRef);

      let cart: any[] = [];
      if (snap.exists()) {
        const data = snap.data();
        cart = Array.isArray(data?.cart) ? data.cart : [];
      } else {
        // if user doc doesn't exist create minimal doc
        await setDoc(userRef, { createdAt: serverTimestamp(), cart: [] }, { merge: true });
        cart = [];
      }

      // prevent duplicates by productId
      const exists = cart.some((it: any) => it.productId === productId);
      if (exists) {
        setAdded(true);
        Alert.alert("Already in cart", "This product is already in your cart.");
        return;
      }

      const itemToAdd = {
        productId,
        name: product.name,
        price: product.price,
        image: product.image,
        condition: product.condition,
        owner: product.owner,
        addedAt: Date.now(),
      };

      cart.push(itemToAdd);

      await updateDoc(userRef, { cart });

      setAdded(true);
    } catch (err: any) {
      console.error("Add to cart error:", err);
      Alert.alert("Error", "Could not add to cart: " + (err?.message ?? err));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container}>
          {/* Back Button */}
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>

          <Image source={{ uri: product.image }} style={styles.image} />
          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.price}>${product.price}</Text>
          <Text style={styles.condition}>Condition: {product.condition}</Text>

          {/* Owner + verification */}
          <View style={styles.ownerRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(product.owner)}</Text>
            </View>
            <View style={styles.ownerInfo}>
              <Text style={styles.ownerName} numberOfLines={1} ellipsizeMode="tail">
                {product.owner}
              </Text>
              <Text style={styles.ownerSubText}>Seller</Text>
            </View>
            {verificationSource ? (
              <View style={styles.ownerVerifiedBadge}>
                <Text style={styles.ownerVerifiedText}>
                  Owner purchase verified from {verificationSource}
                </Text>
              </View>
            ) : (
              <View style={styles.ownerUnverifiedBadge}>
                <Text style={styles.ownerUnverifiedText}>Unverified owner</Text>
              </View>
            )}
          </View>

          {/* Add to Cart Button */}
          <TouchableOpacity
            style={[styles.cartButton, added && styles.cartButtonAdded]}
            onPress={addToCart}
            disabled={added}
          >
            <Text style={[styles.cartButtonText, added && styles.cartButtonTextAdded]}>
              {added ? "Added Successfully" : "Add to Cart"}
            </Text>
          </TouchableOpacity>

          {/* Product details */}
          <Text style={styles.sectionTitle}>Product Details</Text>
          <Text style={styles.description}>
            {product.detail ??
              "Premium quality product with detailed specification. This will show the product description from the backend if available."}
          </Text>

          {/* Shipping info */}
          <Text style={styles.sectionTitle}>Shipping</Text>
          <Text style={styles.description}>
            Standard delivery: 4–6 business days.{"\n"}
            Express delivery: 2–3 business days.
          </Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

// reuse your existing styles (same as you provided)
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: "#fff",
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 10,
    padding: 8,
    borderRadius: 20,
  },
  image: {
    width: "100%",
    height: 300,
    borderRadius: 16,
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  price: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  condition: {
    fontSize: 16,
    color: "#888",
    marginBottom: 8,
  },
  sizes: {
    fontSize: 16,
    marginBottom: 12,
  },
  ownerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#eef2ff",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#3b49b8",
    fontWeight: "700",
    fontSize: 16,
  },
  ownerInfo: {
    flex: 1,
    justifyContent: "center",
  },
  ownerName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#222",
  },
  ownerSubText: {
    fontSize: 12,
    color: "#666",
  },
  ownerVerifiedBadge: {
    backgroundColor: "#e6f8ef",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginLeft: 8,
    maxWidth: 200,
  },
  ownerVerifiedText: {
    color: "#1b7a3a",
    fontSize: 12,
    fontWeight: "600",
  },
  ownerUnverifiedBadge: {
    backgroundColor: "#f5f5f5",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginLeft: 8,
  },
  ownerUnverifiedText: {
    color: "#777",
    fontSize: 12,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: "#555",
    lineHeight: 24,
  },
  cartButton: {
    marginTop: 20,
    backgroundColor: "#3b49b8",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  cartButtonAdded: {
    backgroundColor: "#1b7a3a",
  },
  cartButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  cartButtonTextAdded: {
    color: "#fff",
  },
});
