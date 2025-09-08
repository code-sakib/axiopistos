import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function DetailsScreen() {
  const { product: productString } = useLocalSearchParams();
  const router = useRouter();

  if (!productString) {
    return <Text>No product data available.</Text>;
  }

  const product = JSON.parse(productString as string);

  // pick a single verification source (owner can't be verified by multiple sources for same product)
  const verificationSource =
    Array.isArray(product.verificationBadges) && product.verificationBadges.length > 0
      ? product.verificationBadges[0]
      : null;

  // helper to render initials for avatar
  const getInitials = (name?: string) => {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return (parts[0].slice(0, 1) + parts[1].slice(0, 1)).toUpperCase();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container}>
          {/* Back Button layered above content */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>

          <Image source={{ uri: product.image }} style={styles.image} />
          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.price}>${product.price}</Text>
          <Text style={styles.condition}>Condition: {product.condition}</Text>
          {product.sizes && (
            <Text style={styles.sizes}>Sizes: {product.sizes.join(", ")}</Text>
          )}

          {/* Owner + verification row (collaborated) */}
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

          {/* Product details */}
          <Text style={styles.sectionTitle}>Product Details</Text>
          <Text style={styles.description}>
            {product.description ??
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

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: "#fff",
  },
  backButton: {
    position: "absolute",
    top: 50, // adjust for notch / safe area
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

  /* Owner + verification combined row */
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
});
