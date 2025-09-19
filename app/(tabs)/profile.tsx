import { useRouter } from "expo-router";
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

const av = [
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQzIBEdteo9kxmwnX9lCyBwvZpVDKILV-Zfkw&s",
];
const rn = ["RunWarrior"];

export default function ProfileScreen() {
  const [avatar] = useState(
    av[Math.floor(Math.random() * av.length)]
  );
  const [username] = useState(
    rn[Math.floor(Math.random() * rn.length)]
  );
  const [orders] = useState<number>(0);
  const router = useRouter();

  const signOut = () => {
    Alert.alert("Signed out", "You have been logged out.");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Profile Header */}
        <View style={styles.card}>
          <Image source={{ uri: avatar }} style={styles.avatar} />
          <Text style={styles.username}>{username}</Text>
        </View>

        {/* Orders Section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Orders</Text>
          <Text style={styles.listItem}>You have {orders} orders</Text>
        </View>

        {/* Selling Section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>You want to sell</Text>
          <Text style={styles.listItem}>{orders} products</Text>
        </View>

        {/* Selling Button */}
        <TouchableOpacity
          style={styles.button}
          onPress={() =>
            router.push({
              pathname: "/sellingScreen" as any,
              params: {},
            })
          }
        >
          <Text style={styles.buttonText}>Start Selling</Text>
        </TouchableOpacity>

        {/* About Section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>About Axiopistos</Text>
          <Text style={styles.listItem}>
            • Verifies purchases from trusted sources
          </Text>
          <Text style={styles.listItem}>
            • Uses Reclaim to ensure authenticity
          </Text>
          <Text style={styles.listItem}>• Leverages zkTLS for private proof</Text>
          <Text style={styles.listItem}>• Prevents fake claims & fraud</Text>
          <Text style={styles.listItem}>
            • Builds trust in peer-to-peer selling
          </Text>
        </View>

        {/* App Version */}
        <View style={styles.card}>
          <Text style={styles.version}>App Version 1.0.0</Text>
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={[styles.button, styles.signOut]} onPress={signOut}>
          <Text style={[styles.buttonText, { color: "#fff" }]}>Sign Out</Text>
        </TouchableOpacity>
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
  sectionTitle: { fontSize: 16, fontWeight: "bold", color: "#222", marginBottom: 10 },
  listItem: { fontSize: 14, color: "#555", marginBottom: 5, alignSelf: "flex-start" },
  version: { fontSize: 14, color: "#888", textAlign: "center" },
  signOut: { backgroundColor: "#e63946" },
});