// seedFirestore.js
const admin = require("firebase-admin");
const fs = require("fs");

// Load service account key
const serviceAccount = require("./serviceAccountKey.json");

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Your product data (paste here)
const products = [
  {
    id: "1",
    name: 'Air Jordan 1 Retro High OG "Chicago"',
    price: 2200,
    image: "https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg",
    category: "Sneakers",
    verified: true,
    verificationBadges: ["StockX", "GOAT"],
    condition: "New",
    sizes: ["8", "8.5", "9", "9.5", "10", "10.5", "11"],
  },
  {
    id: "2",
    name: "Rolex Submariner Date",
    price: 12500,
    image: "https://images.pexels.com/photos/280250/pexels-photo-280250.jpeg",
    category: "Watches",
    verified: true,
    verificationBadges: ["TheRealReal"],
    condition: "Excellent",
  },
  {
    id: "3",
    name: "Louis Vuitton Neverfull MM",
    price: 1850,
    image: "https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg",
    category: "Bags",
    verified: true,
    verificationBadges: ["TheRealReal", "Vestiaire"],
    condition: "Very Good",
  },
  {
    id: "4",
    name: "Pokemon Charizard 1st Edition PSA 10",
    price: 5500,
    image: "https://images.pexels.com/photos/9857460/pexels-photo-9857460.jpeg",
    category: "Cards",
    verified: true,
    verificationBadges: ["PSA", "PWCC"],
    condition: "Mint",
  },
  {
    id: "5",
    name: 'Off-White x Nike Dunk Low "Lot 01"',
    price: 3200,
    image: "https://images.pexels.com/photos/1464625/pexels-photo-1464625.jpeg",
    category: "Sneakers",
    verified: true,
    verificationBadges: ["StockX", "GOAT", "Flight Club"],
    condition: "New",
    sizes: ["7", "7.5", "8", "8.5", "9", "9.5", "10"],
  },
  {
    id: "6",
    name: "Hermès Birkin 35cm Togo Black",
    price: 18500,
    image: "https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg",
    category: "Bags",
    verified: true,
    verificationBadges: ["TheRealReal", "Fashionphile"],
    condition: "Excellent",
  },
  {
    id: "7",
    name: "Supreme Box Logo Hoodie Gray",
    price: 1200,
    image: "https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg",
    category: "Clothes",
    verified: true,
    verificationBadges: ["StockX", "Grailed"],
    condition: "New",
    sizes: ["S", "M", "L", "XL"],
  },
  {
    id: "8",
    name: "Audemars Piguet Royal Oak",
    price: 35000,
    image: "https://images.pexels.com/photos/280250/pexels-photo-280250.jpeg",
    category: "Watches",
    verified: true,
    verificationBadges: ["Chrono24"],
    condition: "Very Good",
  },
  {
    id: "9",
    name: "Travis Scott x Fragment Jordan 1 Low",
    price: 1800,
    image: "https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg",
    category: "Sneakers",
    verified: true,
    verificationBadges: ["StockX", "GOAT"],
    condition: "New",
    sizes: ["8", "8.5", "9", "9.5", "10", "10.5", "11", "12"],
  },
  {
    id: "10",
    name: "Chanel Classic Flap Bag Medium",
    price: 6800,
    image: "https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg",
    category: "Bags",
    verified: true,
    verificationBadges: ["TheRealReal", "Vestiaire"],
    condition: "Good",
  },
  {
    id: "11",
    name: "Michael Jordan 1986-87 Fleer PSA 10",
    price: 120000,
    image: "https://images.pexels.com/photos/9857460/pexels-photo-9857460.jpeg",
    category: "Cards",
    verified: true,
    verificationBadges: ["PSA", "Heritage Auctions"],
    condition: "Mint",
  },
  {
    id: "12",
    name: "Fear of God Essentials Hoodie",
    price: 180,
    image: "https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg",
    category: "Clothes",
    verified: true,
    verificationBadges: ["StockX"],
    condition: "New",
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
  },
  {
    id: "13",
    name: "Patek Philippe Nautilus 5711/1A",
    price: 85000,
    image: "https://images.pexels.com/photos/280250/pexels-photo-280250.jpeg",
    category: "Watches",
    verified: true,
    verificationBadges: ["Chrono24", "Crown & Caliber"],
    condition: "Excellent",
  },
  {
    id: "14",
    name: 'Nike SB Dunk Low "What The Paul"',
    price: 4500,
    image: "https://images.pexels.com/photos/1464625/pexels-photo-1464625.jpeg",
    category: "Sneakers",
    verified: true,
    verificationBadges: ["StockX", "Flight Club"],
    condition: "Used",
    sizes: ["8", "9", "10", "11"],
  },
  {
    id: "15",
    name: "Bottega Veneta Cassette Bag",
    price: 2400,
    image: "https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg",
    category: "Bags",
    verified: true,
    verificationBadges: ["TheRealReal"],
    condition: "Very Good",
  },
  {
    id: "16",
    name: "Kobe Bryant 1996 Topps Chrome PSA 9",
    price: 3200,
    image: "https://images.pexels.com/photos/9857460/pexels-photo-9857460.jpeg",
    category: "Cards",
    verified: true,
    verificationBadges: ["PSA"],
    condition: "Near Mint",
  },
  {
    id: "17",
    name: "Stone Island Shadow Project Jacket",
    price: 850,
    image: "https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg",
    category: "Clothes",
    verified: true,
    verificationBadges: ["Grailed"],
    condition: "Good",
    sizes: ["M", "L", "XL"],
  },
  {
    id: "18",
    name: "Richard Mille RM 011 Felipe Massa",
    price: 125000,
    image: "https://images.pexels.com/photos/280250/pexels-photo-280250.jpeg",
    category: "Watches",
    verified: true,
    verificationBadges: ["Chrono24"],
    condition: "Good",
  },
  {
    id: "19",
    name: 'Yeezy Boost 350 V2 "Zebra"',
    price: 380,
    image: "https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg",
    category: "Sneakers",
    verified: true,
    verificationBadges: ["StockX", "GOAT"],
    condition: "New",
    sizes: [
      "7",
      "7.5",
      "8",
      "8.5",
      "9",
      "9.5",
      "10",
      "10.5",
      "11",
      "11.5",
      "12",
    ],
  },
  {
    id: "20",
    name: "Gucci GG Marmont Matelassé",
    price: 1650,
    image: "https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg",
    category: "Bags",
    verified: true,
    verificationBadges: ["TheRealReal", "Vestiaire"],
    condition: "Very Good",
  },
];

async function seedData() {
  try {
    const batch = db.batch();

    products.forEach((product) => {
      const ref = db
        .collection("products")
        .doc("demo") // parent doc
        .collection("items") // subcollection under demo
        .doc(product.id); // product id
      batch.set(ref, product);
    });

    await batch.commit();
    console.log("✅ Products uploaded successfully!");
  } catch (err) {
    console.error("❌ Error seeding data:", err);
  }
}

seedData();
