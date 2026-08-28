import "dotenv/config";
import { db, pool } from "../src/db";
import { categories, products, users, settings } from "../src/db/schema";
import { hashPassword } from "../src/lib/auth";
import { slugify } from "../src/lib/utils";
import { eq } from "drizzle-orm";

type SeedCategory = { name: string; description: string; image: string };
type SeedProduct = {
  name: string;
  category: string;
  price: number;
  compareAtPrice?: number;
  deal?: boolean;
  dealPrice?: number;
  stock: number;
  featured?: boolean;
  description: string;
  images: string[];
  specs: Record<string, string>;
};

const CATEGORY_IMAGES: Record<string, string> = {
  Microcontrollers: "/images/cat-microcontrollers.jpg",
  Sensors: "/images/cat-sensors.jpg",
  "Power & Batteries": "/images/cat-power.jpg",
  Robotics: "/images/cat-robotics.jpg",
  "Tools & Prototyping": "/images/cat-tools.jpg",
  "Displays & Modules": "/images/cat-displays.jpg",
};

const CATS: SeedCategory[] = [
  {
    name: "Microcontrollers",
    description: "Arduino, ESP32, Raspberry Pi Pico and more programmable boards.",
    image: "/images/cat-microcontrollers.jpg",
  },
  {
    name: "Sensors",
    description: "Temperature, motion, gas, distance and environmental sensors.",
    image: "/images/cat-sensors.jpg",
  },
  {
    name: "Power & Batteries",
    description: "Power supplies, battery packs, voltage regulators and chargers.",
    image: "/images/cat-power.jpg",
  },
  {
    name: "Robotics",
    description: "Motors, drivers, chassis kits and robotic arms.",
    image: "/images/cat-robotics.jpg",
  },
  {
    name: "Tools & Prototyping",
    description: "Breadboards, soldering irons, jumper wires and multimeters.",
    image: "/images/cat-tools.jpg",
  },
  {
    name: "Displays & Modules",
    description: "OLED, LCD, LED matrices and communication modules.",
    image: "/images/cat-displays.jpg",
  },
];

const PRODUCTS: SeedProduct[] = [
  {
    name: "SynapCore ESP32 Dev Board",
    category: "Microcontrollers",
    price: 14.99,
    compareAtPrice: 19.99,
    deal: true,
    dealPrice: 11.99,
    stock: 240,
    featured: true,
    description:
      "Dual-core Wi-Fi & Bluetooth development board perfect for IoT projects. Compatible with Arduino IDE and MicroPython.",
    images: [],
    specs: { CPU: "Dual-core 240MHz", Wifi: "802.11 b/g/n", Bluetooth: "BLE 4.2", GPIO: "34 pins" },
  },
  {
    name: "Arduino Uno R3 Compatible",
    category: "Microcontrollers",
    price: 9.99,
    stock: 500,
    featured: true,
    description: "The classic ATmega328P based board for beginners and prototyping.",
    images: [],
    specs: { Microcontroller: "ATmega328P", "Operating Voltage": "5V", "Digital I/O": "14" },
  },
  {
    name: "Raspberry Pi Pico W",
    category: "Microcontrollers",
    price: 6.99,
    compareAtPrice: 8.5,
    deal: true,
    dealPrice: 5.49,
    stock: 300,
    description: "RP2040 dual-core microcontroller with built-in Wi-Fi.",
    images: [],
    specs: { CPU: "Dual-core Arm Cortex-M0+", Wifi: "802.11n", Flash: "2MB" },
  },
  {
    name: "DHT22 Temperature & Humidity Sensor",
    category: "Sensors",
    price: 7.5,
    stock: 400,
    featured: true,
    description: "High precision digital temperature and humidity sensor.",
    images: [],
    specs: { "Humidity Range": "0-100% RH", "Temp Range": "-40 to 80°C", Accuracy: "±0.5°C" },
  },
  {
    name: "HC-SR04 Ultrasonic Distance Sensor",
    category: "Sensors",
    price: 3.25,
    stock: 600,
    description: "Non-contact distance measurement from 2cm to 400cm.",
    images: [],
    specs: { Range: "2-400cm", Voltage: "5V", Accuracy: "3mm" },
  },
  {
    name: "MQ-2 Gas & Smoke Sensor",
    category: "Sensors",
    price: 4.1,
    compareAtPrice: 5.6,
    deal: true,
    dealPrice: 3.2,
    stock: 250,
    description: "Detects LPG, smoke, alcohol, propane, hydrogen and methane gas.",
    images: [],
    specs: { "Detection Range": "300-10000ppm", Voltage: "5V" },
  },
  {
    name: "18650 Li-ion Battery 3.7V 3000mAh",
    category: "Power & Batteries",
    price: 5.99,
    stock: 350,
    description: "Rechargeable lithium-ion cell for robotics and portable projects.",
    images: [],
    specs: { Voltage: "3.7V", Capacity: "3000mAh", Type: "Li-ion" },
  },
  {
    name: "LM2596 Buck Converter Module",
    category: "Power & Batteries",
    price: 2.49,
    stock: 500,
    description: "Adjustable step-down voltage regulator, 3A output.",
    images: [],
    specs: { "Input Voltage": "4-40V", "Output Voltage": "1.25-37V", Current: "3A max" },
  },
  {
    name: "18650 Battery Charger Shield",
    category: "Power & Batteries",
    price: 8.99,
    compareAtPrice: 10.99,
    deal: true,
    dealPrice: 7.49,
    stock: 180,
    description: "Charge and boost power from 18650 cells with USB output.",
    images: [],
    specs: { Output: "5V USB", Input: "Micro-USB", "Cell Slots": "1" },
  },
  {
    name: "N20 Micro Gear Motor",
    category: "Robotics",
    price: 4.75,
    stock: 300,
    featured: true,
    description: "Compact DC gear motor ideal for small robots and mechanisms.",
    images: [],
    specs: { Voltage: "6V", RPM: "200", Shaft: "D-Type" },
  },
  {
    name: "L298N Motor Driver Module",
    category: "Robotics",
    price: 3.99,
    stock: 400,
    description: "Dual H-Bridge motor driver for controlling DC and stepper motors.",
    images: [],
    specs: { "Max Current": "2A per channel", "Logic Voltage": "5V" },
  },
  {
    name: "4WD Robot Chassis Kit",
    category: "Robotics",
    price: 22.99,
    compareAtPrice: 27.99,
    deal: true,
    dealPrice: 18.99,
    stock: 90,
    featured: true,
    description: "Aluminum chassis with 4 motors and wheels for robotics projects.",
    images: [],
    specs: { Motors: "4x DC gear motor", Material: "Aluminum" },
  },
  {
    name: "Breadboard 830 Point",
    category: "Tools & Prototyping",
    price: 3.5,
    stock: 700,
    description: "Solderless breadboard for rapid circuit prototyping.",
    images: [],
    specs: { Points: "830", Size: "165x55mm" },
  },
  {
    name: "Jumper Wire Set (120pcs)",
    category: "Tools & Prototyping",
    price: 5.25,
    stock: 500,
    description: "Male-to-male, male-to-female and female-to-female jumper wires.",
    images: [],
    specs: { Count: "120", Length: "20cm" },
  },
  {
    name: "Digital Multimeter DT-830B",
    category: "Tools & Prototyping",
    price: 11.99,
    compareAtPrice: 15.99,
    deal: true,
    dealPrice: 9.99,
    stock: 220,
    featured: true,
    description: "Measures voltage, current, resistance and continuity.",
    images: [],
    specs: { Display: "3.5 digit LCD", Ranges: "AC/DC V, A, Ω" },
  },
  {
    name: "Soldering Iron Kit 60W",
    category: "Tools & Prototyping",
    price: 17.99,
    stock: 150,
    description: "Adjustable temperature soldering iron kit with accessories.",
    images: [],
    specs: { Power: "60W", "Temp Range": "200-450°C" },
  },
  {
    name: "0.96\" OLED Display Module",
    category: "Displays & Modules",
    price: 4.99,
    stock: 350,
    featured: true,
    description: "I2C SSD1306 OLED display, 128x64 resolution.",
    images: [],
    specs: { Resolution: "128x64", Interface: "I2C", Size: "0.96 inch" },
  },
  {
    name: "16x2 LCD Display with I2C Backpack",
    category: "Displays & Modules",
    price: 5.75,
    compareAtPrice: 7.25,
    deal: true,
    dealPrice: 4.6,
    stock: 260,
    description: "Character LCD with I2C adapter for simplified wiring.",
    images: [],
    specs: { Characters: "16x2", Interface: "I2C" },
  },
  {
    name: "NRF24L01 Wireless Transceiver",
    category: "Displays & Modules",
    price: 2.99,
    stock: 400,
    description: "2.4GHz wireless communication module for microcontrollers.",
    images: [],
    specs: { Frequency: "2.4GHz", Range: "100m" },
  },
  {
    name: "8x8 LED Matrix MAX7219",
    category: "Displays & Modules",
    price: 3.85,
    stock: 300,
    description: "Cascadable LED dot matrix display driven by MAX7219.",
    images: [],
    specs: { Size: "8x8", Driver: "MAX7219" },
  },
];

async function main() {
  console.log("Seeding database...");

  const categoryIds: Record<string, number> = {};
  for (const c of CATS) {
    const slug = slugify(c.name);
    const existing = await db.select().from(categories).where(eq(categories.slug, slug));
    if (existing[0]) {
      categoryIds[c.name] = existing[0].id;
      continue;
    }
    const [row] = await db
      .insert(categories)
      .values({ name: c.name, slug, description: c.description, image: c.image })
      .returning();
    categoryIds[c.name] = row.id;
  }

  for (const p of PRODUCTS) {
    const slug = slugify(p.name);
    const existing = await db.select().from(products).where(eq(products.slug, slug));
    if (existing[0]) continue;
    await db.insert(products).values({
      name: p.name,
      slug,
      description: p.description,
      price: p.price.toFixed(2),
      compareAtPrice: p.compareAtPrice ? p.compareAtPrice.toFixed(2) : null,
      dealPrice: p.dealPrice ? p.dealPrice.toFixed(2) : null,
      isDeal: Boolean(p.deal),
      stock: p.stock,
      featured: Boolean(p.featured),
      categoryId: categoryIds[p.category],
      images: [CATEGORY_IMAGES[p.category] ?? "/images/cat-microcontrollers.jpg"],
      specs: p.specs,
      // Ratings/review counts always start at zero. They are only ever
      // updated by real, authenticated customer reviews (see
      // src/app/api/products/[id]/reviews/route.ts) — never seeded/faked.
      rating: "0",
      reviewCount: 0,
    });
  }

  const adminEmail = "admin@synapcircuit.com";
  const existingAdmin = await db.select().from(users).where(eq(users.email, adminEmail));
  if (!existingAdmin[0]) {
    await db.insert(users).values({
      name: "Store Admin",
      email: adminEmail,
      passwordHash: await hashPassword("Admin@12345"),
      role: "admin",
      emailVerified: true,
    });
    console.log("Created admin user: admin@synapcircuit.com / Admin@12345");
  }

  const demoEmail = "customer@synapcircuit.com";
  const existingDemo = await db.select().from(users).where(eq(users.email, demoEmail));
  if (!existingDemo[0]) {
    await db.insert(users).values({
      name: "Demo Customer",
      email: demoEmail,
      passwordHash: await hashPassword("Customer@12345"),
      role: "customer",
      emailVerified: true,
    });
    console.log("Created demo customer: customer@synapcircuit.com / Customer@12345");
  }

  await db
    .insert(settings)
    .values({
      key: "store",
      value: {
        storeName: "SynapCircuit",
        supportEmail: "support@synapcircuit.com",
        currency: "USD",
        taxRate: 0.08,
        shippingFee: 6.99,
        freeShippingThreshold: 75,
      },
    })
    .onConflictDoNothing();

  console.log("Seeding complete.");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
