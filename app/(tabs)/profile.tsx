import ReclaimComponent from "@/components/ReclaimComponent";
import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Image, ScrollView, Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
    return (
        <SafeAreaView>
            <ScrollView className="flex-1 bg-neutral-100">
                {/* Profile Header */}
                <View className="px-5 pt-10">
                    <View className="items-center bg-white rounded-2xl shadow-lg p-6">
                        <View className="w-20 h-20 rounded-full border-4 border-indigo-500 overflow-hidden">
                            <Image
                                source={{
                                    uri: "https://i.pravatar.cc/300",
                                }}
                                className="w-full h-full"
                            />
                        </View>
                        <Text className="text-xl font-semibold mt-3">Welcome back!</Text>
                        <Text className="text-gray-500">@username</Text>
                    </View>
                </View>

                {/* Start Selling CTA */}
                <TouchableOpacity className="mx-5 mt-5 rounded-2xl overflow-hidden shadow-md">
                    <LinearGradient
                        colors={["#4F46E5", "#6366F1"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        className="p-4 items-center"
                    >
                        <Text className="text-white font-bold text-lg">🚀 Start Selling Now</Text>
                    </LinearGradient>
                </TouchableOpacity>
                


                {/* Favorites Section */}
                <View className="mt-6 px-5">
                    <View className="flex-row justify-between items-center mb-3">
                        <View className="flex-row items-center">
                            <Ionicons name="heart" size={20} color="#EF4444" />
                            <Text className="ml-2 text-lg font-semibold">Favorites</Text>
                        </View>
                        <TouchableOpacity>
                            <Text className="text-indigo-600 font-medium">See all</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Favorite Items */}
                    <View className="flex-row space-x-4">
                        {[1, 2].map((item) => (
                            <View
                                key={item}
                                className="bg-white p-4 rounded-2xl shadow-md w-36"
                            >
                                <Feather name="box" size={28} color="#6366F1" />
                                <Text className="mt-2 font-medium">Item {item}</Text>
                                <Text className="text-gray-500 text-sm">$1500</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Orders Section */}
                <View className="mt-8 px-5 mb-10">
                    <View className="flex-row justify-between items-center mb-3">
                        <View className="flex-row items-center">
                            <Ionicons name="cart" size={20} color="#10B981" />
                            <Text className="ml-2 text-lg font-semibold">Orders</Text>
                        </View>
                        <TouchableOpacity>
                            <Text className="text-indigo-600 font-medium">See all</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Orders */}
                    <View className="space-y-4">
                        {[1, 2].map((order) => (
                            <View
                                key={order}
                                className="bg-white p-4 rounded-2xl shadow-md flex-row justify-between items-center"
                            >
                                <View className="flex-row items-center space-x-3">
                                    <Feather name="package" size={24} color="#10B981" />
                                    <View>
                                        <Text className="font-medium">Order #{order}</Text>
                                        <Text className="text-gray-500 text-sm">Delivered</Text>
                                    </View>
                                </View>
                                <Text className="text-gray-700 font-semibold">$120</Text>
                            </View>
                        ))}
                    </View>
                    <ReclaimComponent />
                </View>
            </ScrollView>

        </SafeAreaView>
    );
}
