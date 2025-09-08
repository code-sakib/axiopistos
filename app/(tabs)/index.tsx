import { fetchProducts } from "@/services/firebase";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const data = await fetchProducts();
      setProducts(data);
    })();
  }, []);

  const filteredProducts = products.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );


  const renderProduct = ({ item }: { item: any }) => {
    // Choose only the first verification source (owner can't be verified by multiple sources for same product)
    const verificationSource = Array.isArray(item.verificationBadges) && item.verificationBadges.length > 0
      ? item.verificationBadges[0]
      : null;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          router.push({
            pathname: "/details" as any,
            params: { product: JSON.stringify(item) },
          })
        }
      >
        <Image source={{ uri: item.image }} style={styles.image} />

        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.price}>${item.price}</Text>

        {/* Condition now comes first (directly after price) */}
        <Text style={styles.condition}>Condition: {item.condition}</Text>

        <Text style={styles.ownerName} numberOfLines={1} ellipsizeMode="tail">
            {item.owner}
          </Text>
        {/* Owner + verification row comes below the condition */}


          {verificationSource ? (
            <View style={styles.ownerVerifiedBadge}>
              <Text style={styles.ownerVerifiedText}>Verified • {verificationSource}</Text>
            </View>
          ) : (
            <View style={styles.ownerUnverifiedBadge}>
              <Text style={styles.ownerUnverifiedText}>Unverified</Text>
            </View>
          )}
        <View style={styles.ownerRow}>
          

        </View>

        {/* sizes removed as requested */}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        {/* Search bar */}
        <TextInput
          style={styles.search}
          placeholder="Search products..."
          value={search}
          onChangeText={setSearch}
        />

        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          numColumns={2}
          renderItem={renderProduct}
          contentContainerStyle={styles.container}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
  },
  search: {
    margin: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    backgroundColor: "#f9f9f9",
  },
  card: {
    flex: 1,
    margin: 8,
    borderRadius: 16,
    backgroundColor: "#fff",
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  image: {
    width: "100%",
    height: 150,
    borderRadius: 12,
  },
  name: {
    marginTop: 8,
    fontWeight: "600",
    fontSize: 14,
  },
  price: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },

  /* Condition now placed before owner row */
  condition: {
    fontSize: 12,
    color: "#888",
    marginTop: 6,
  },

  /* NEW owner / verification styles */
  ownerRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ownerName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#222",
    paddingVertical: 8
  },
  ownerVerifiedBadge: {
    backgroundColor: "#e6f8ef",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    padding: 8
  },
  ownerVerifiedText: {
    color: "#1b7a3a",
    fontSize: 11,
    fontWeight: "600",
  },
  ownerUnverifiedBadge: {
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  ownerUnverifiedText: {
    color: "#777",
    fontSize: 11,
    fontWeight: "600",
  },

  sizes: {
    fontSize: 12,
    marginTop: 4,
  },
});
