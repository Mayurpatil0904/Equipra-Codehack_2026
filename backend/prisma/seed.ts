// prisma/seed.ts
import { PrismaClient, Role, AvailabilityStatus, FaultScanStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ── Colleges ──────────────────────────────────────────────
  const colleges = await Promise.all([
    prisma.college.upsert({ where: { name: "Parul University" },    update: {}, create: { name: "Parul University" } }),
    prisma.college.upsert({ where: { name: "MS University" },       update: {}, create: { name: "MS University" } }),
    prisma.college.upsert({ where: { name: "SVNIT" },               update: {}, create: { name: "SVNIT" } }),
    prisma.college.upsert({ where: { name: "PDPU" },                update: {}, create: { name: "PDPU" } }),
    prisma.college.upsert({ where: { name: "GEC Vadodara" },        update: {}, create: { name: "GEC Vadodara" } }),
  ]);
  const parul = colleges[0];
  console.log("✅ Colleges seeded");

  // ── Users ─────────────────────────────────────────────────
  const salt = await bcrypt.genSalt(12);
  const studentHash  = await bcrypt.hash("student123", salt);
  const facultyHash  = await bcrypt.hash("faculty123", salt);
  const adminHash    = await bcrypt.hash("admin123",   salt);

  const student = await prisma.user.upsert({
    where:  { enrollmentId: "PU-STU-001" },
    update: {},
    create: {
      enrollmentId: "PU-STU-001",
      name:         "Aditya Patel",
      email:        "aditya.patel@paruluniversity.ac.in",
      passwordHash: studentHash,
      role:         Role.STUDENT,
      department:   "Electronics & Communication",
      semester:     "5th",
      collegeId:    parul.id,
    },
  });

  const student2 = await prisma.user.upsert({
    where:  { enrollmentId: "PU-STU-002" },
    update: {},
    create: {
      enrollmentId: "PU-STU-002",
      name:         "Riya Shah",
      email:        "riya.shah@paruluniversity.ac.in",
      passwordHash: studentHash,
      role:         Role.STUDENT,
      department:   "Electronics & Communication",
      semester:     "5th",
      collegeId:    parul.id,
    },
  });

  const student3 = await prisma.user.upsert({
    where:  { enrollmentId: "PU-STU-003" },
    update: {},
    create: {
      enrollmentId: "PU-STU-003",
      name:         "Dev Mehta",
      email:        "dev.mehta@paruluniversity.ac.in",
      passwordHash: studentHash,
      role:         Role.STUDENT,
      department:   "Computer Science",
      semester:     "3rd",
      collegeId:    parul.id,
    },
  });

  const faculty = await prisma.user.upsert({
    where:  { enrollmentId: "PU-FAC-001" },
    update: {},
    create: {
      enrollmentId: "PU-FAC-001",
      name:         "Prof. H. Patel",
      email:        "h.patel@paruluniversity.ac.in",
      passwordHash: facultyHash,
      role:         Role.FACULTY,
      department:   "Electronics & Communication",
      collegeId:    parul.id,
    },
  });

  const faculty2 = await prisma.user.upsert({
    where:  { enrollmentId: "PU-FAC-002" },
    update: {},
    create: {
      enrollmentId: "PU-FAC-002",
      name:         "Prof. R. Sharma",
      email:        "r.sharma@paruluniversity.ac.in",
      passwordHash: facultyHash,
      role:         Role.FACULTY,
      department:   "Electronics & Communication",
      collegeId:    parul.id,
    },
  });

  const admin = await prisma.user.upsert({
    where:  { enrollmentId: "PU-ADM-001" },
    update: {},
    create: {
      enrollmentId: "PU-ADM-001",
      name:         "Lab Assistant",
      email:        "lab.assistant@paruluniversity.ac.in",
      passwordHash: adminHash,
      role:         Role.ADMIN,
      department:   "Laboratory",
      collegeId:    parul.id,
      canManageAdmins: true,
    },
  });

  console.log("✅ Users seeded");

  // ── Equipment ─────────────────────────────────────────────
  const equipmentSeed = [
    {
      slug: "iwr6843isk", name: "TI IWR6843ISK Radar Board", category: "Radar Sensors",
      description: "Industrial mmWave radar sensor for presence detection, gesture recognition, and vital signs monitoring.",
      typicalUses: ["Gesture Recognition Research", "Vital Signs Monitoring", "Presence Detection Systems"],
      labLocation: "Lab — Room D326", supervisorName: "Prof. H. Patel",
      availabilityStatus: AvailabilityStatus.issued, faultScanStatus: FaultScanStatus.scanned_ok_before,
      conditionLog: "Excellent condition, all connectors intact", emoji: "📡",
      lastIssuedTo: "PU-ECE-2503031070001", returnDate: "12 May 2026",
    },
    {
      slug: "stm32-dev", name: "STM32 Development Board", category: "Microcontrollers",
      description: "ARM Cortex-M based development board for embedded systems projects and IoT applications.",
      typicalUses: ["Embedded Systems Lab", "IoT Projects", "Real-time Applications"],
      labLocation: "Embedded Lab — Room D301", supervisorName: "Prof. H. Patel",
      availabilityStatus: AvailabilityStatus.available, faultScanStatus: FaultScanStatus.scanned_ok_after,
      conditionLog: "Good condition, minor wear on USB port", emoji: "🔲",
    },
    {
      slug: "fpga-board", name: "FPGA Development Board", category: "Programmable Logic",
      description: "Xilinx Artix-7 FPGA board for digital design, signal processing, and hardware acceleration.",
      typicalUses: ["Digital Design Labs", "Signal Processing", "Hardware Acceleration Research"],
      labLocation: "VLSI Lab — Room D324", supervisorName: "Prof. Elahi Shaikh",
      availabilityStatus: AvailabilityStatus.maintenance, faultScanStatus: FaultScanStatus.fault_evaluation,
      conditionLog: "JTAG connector issue reported", emoji: "🎛️",
    },
    {
      slug: "esp32-wifi", name: "ESP32 Wi-Fi Module", category: "Wireless Modules",
      description: "Dual-core microcontroller with integrated Wi-Fi and Bluetooth for IoT projects.",
      typicalUses: ["IoT Prototyping", "Wireless Sensor Networks", "Smart Device Development"],
      labLocation: "IoT Lab — Room D319", supervisorName: "Prof. Tosif Babu",
      availabilityStatus: AvailabilityStatus.available, faultScanStatus: FaultScanStatus.scanned_ok_after,
      conditionLog: "Excellent condition", emoji: "📶",
    },
    {
      slug: "sdr-receiver", name: "SDR Receiver", category: "RF Equipment",
      description: "Software-defined radio receiver for wireless communication research and signal analysis.",
      typicalUses: ["Communication Systems Lab", "Spectrum Analysis", "RF Research"],
      labLocation: "D-Block Lab — Room 314", supervisorName: "Dr. Kalpesh Jadav",
      availabilityStatus: AvailabilityStatus.reserved, faultScanStatus: FaultScanStatus.not_scanned,
      conditionLog: "Reserved for upcoming research project", emoji: "📻",
    },
    {
      slug: "high-speed-adc", name: "High-speed ADC Board", category: "Data Acquisition",
      description: "High-speed analog-to-digital converter for precision measurement and signal acquisition.",
      typicalUses: ["Signal Acquisition", "Measurement Systems", "Data Logging Projects"],
      labLocation: "Microprocessor Lab — Room D326", supervisorName: "Prof. M. Yadav",
      availabilityStatus: AvailabilityStatus.issued, faultScanStatus: FaultScanStatus.fault_detected,
      conditionLog: "Connector damage detected after return", emoji: "📊",
      lastIssuedTo: "PU-ECE-2503031070016",
    },
    {
      slug: "arduino-uno-r3", name: "Arduino Uno R3", category: "Microcontrollers",
      description: "ATmega328P-based board widely used for electronics prototyping and embedded development.",
      typicalUses: ["Beginner Embedded Projects", "Sensor Integration", "Automation Systems"],
      labLocation: "Embedded Systems Lab — Room D301", supervisorName: "Prof. H. Patel",
      availabilityStatus: AvailabilityStatus.available, faultScanStatus: FaultScanStatus.scanned_ok_after,
      conditionLog: "Fully functional, tested recently", emoji: "⚡",
    },
    {
      slug: "arduino-mega-2560", name: "Arduino Mega 2560", category: "Microcontrollers",
      description: "Advanced microcontroller board with 54 digital I/O pins for complex multi-peripheral projects.",
      typicalUses: ["Robotics", "Large Embedded Projects", "Industrial Prototypes"],
      labLocation: "Embedded Systems Lab — Room D301", supervisorName: "Prof. H. Patel",
      availabilityStatus: AvailabilityStatus.available, faultScanStatus: FaultScanStatus.not_scanned,
      conditionLog: "New board, awaiting first scan", emoji: "🔌",
    },
    {
      slug: "raspberry-pi-4", name: "Raspberry Pi 4 Model B", category: "Single Board Computers",
      description: "Powerful SBC for AI projects, edge computing, Linux development, and IoT systems.",
      typicalUses: ["AI Projects", "Edge Computing", "Linux-based Development"],
      labLocation: "Advanced Computing Lab — Room D310", supervisorName: "Dr. Kalpesh Jadav",
      availabilityStatus: AvailabilityStatus.issued, faultScanStatus: FaultScanStatus.scanned_ok_before,
      conditionLog: "Issued with power adapter and SD card", emoji: "🍓",
      lastIssuedTo: "PU-ECE-2503031070021",
    },
    {
      slug: "dht11-module", name: "DHT11 Temperature & Humidity Module", category: "Sensors",
      description: "Digital sensor for measuring ambient temperature and humidity in IoT projects.",
      typicalUses: ["Weather Stations", "Smart Homes", "Environmental Monitoring"],
      labLocation: "IoT Lab — Room D319", supervisorName: "Prof. Tosif Babu",
      availabilityStatus: AvailabilityStatus.available, faultScanStatus: FaultScanStatus.not_scanned,
      conditionLog: "Batch received — scanning pending", emoji: "🌡️",
    },
    {
      slug: "ultrasonic-sensor", name: "HC-SR04 Ultrasonic Sensor", category: "Sensors",
      description: "Ultrasonic distance sensor capable of measuring distances from 2cm to 400cm.",
      typicalUses: ["Obstacle Detection", "Robotics", "Distance Measurement"],
      labLocation: "IoT Lab — Room D319", supervisorName: "Prof. Tosif Babu",
      availabilityStatus: AvailabilityStatus.available, faultScanStatus: FaultScanStatus.scanned_ok_after,
      conditionLog: "Excellent condition", emoji: "🌊",
    },
    {
      slug: "rc522-rfid", name: "RC522 RFID Module", category: "Wireless Modules",
      description: "13.56 MHz RFID reader module for authentication, access control, and identification.",
      typicalUses: ["Access Control", "Smart Attendance Systems", "Security Projects"],
      labLocation: "Embedded Systems Lab — Room D301", supervisorName: "Prof. Elahi Shaikh",
      availabilityStatus: AvailabilityStatus.reserved, faultScanStatus: FaultScanStatus.not_scanned,
      conditionLog: "Reserved for Smart Attendance Project", emoji: "🏷️",
    },
    {
      slug: "ir-receiver", name: "IR Receiver Module", category: "Sensors",
      description: "Infrared receiver module used for remote control decoding and wireless command systems.",
      typicalUses: ["Remote Control Systems", "Home Automation", "IR Communication"],
      labLocation: "Electronics Lab — Room D305", supervisorName: "Prof. M. Yadav",
      availabilityStatus: AvailabilityStatus.available, faultScanStatus: FaultScanStatus.scanned_ok_after,
      conditionLog: "Working perfectly", emoji: "🔴",
    },
  ];

  for (const eq of equipmentSeed) {
    await prisma.equipment.upsert({
      where:  { slug: eq.slug },
      update: {},
      create: eq,
    });
  }
  console.log("✅ Equipment seeded");

  // ── Seed a team ───────────────────────────────────────────
  const existingTeam = await prisma.team.findUnique({ where: { teamCode: "TEAM-PU-0042" } });
  if (!existingTeam) {
    const team = await prisma.team.create({
      data: {
        teamCode:    "TEAM-PU-0042",
        name:        "Smart IoT Group",
        project:     "IoT Home Automation Suite",
        professorId: faculty.id,
        active:      true,
      },
    });
    await prisma.teamMember.createMany({
      data: [
        { teamId: team.id, userId: student.id,  role: "Leader" },
        { teamId: team.id, userId: student2.id, role: "Member" },
        { teamId: team.id, userId: student3.id, role: "Member" },
      ],
    });
    console.log("✅ Demo team seeded: TEAM-PU-0042");
  }

  // ── Project Templates ─────────────────────────────────────
  const templateCount = await prisma.projectTemplate.count();
  if (templateCount === 0) {
    await prisma.projectTemplate.createMany({
      data: [
        {
          name: "Smart Home Monitoring",
          description: "Monitor temperature, humidity, gas levels, and door status with ESP32 sensors.",
          department: "Electronics & Communication",
          projectType: "HARDWARE",
          technologyStack: ["ESP32", "DHT22", "MQ-2", "Arduino IDE", "MQTT"],
          telemetryPresets: JSON.stringify([
            { fieldName: "temperature", label: "Temperature", unit: "°C", dataType: "NUMBER", widgetType: "GAUGE", thresholdMin: 10, thresholdMax: 45 },
            { fieldName: "humidity", label: "Humidity", unit: "%", dataType: "NUMBER", widgetType: "GAUGE", thresholdMin: 20, thresholdMax: 90 },
            { fieldName: "gasLevel", label: "Gas Level", unit: "ppm", dataType: "NUMBER", widgetType: "CHART", thresholdMax: 400 },
            { fieldName: "doorStatus", label: "Door Status", dataType: "BOOLEAN", widgetType: "LED" },
          ]),
          isPublic: true,
          createdById: admin.id,
        },
        {
          name: "Industrial Safety System",
          description: "Flame detection, smoke sensing, and emergency alert system for factory environments.",
          department: "Electrical Engineering",
          projectType: "HARDWARE",
          technologyStack: ["Arduino Mega", "Flame Sensor", "MQ-135", "Buzzer", "GSM Module"],
          telemetryPresets: JSON.stringify([
            { fieldName: "flameDetected", label: "Flame Detected", dataType: "BOOLEAN", widgetType: "LED" },
            { fieldName: "smokeLevel", label: "Smoke Level", unit: "ppm", dataType: "NUMBER", widgetType: "GAUGE", thresholdMax: 300 },
            { fieldName: "ambientTemp", label: "Ambient Temp", unit: "°C", dataType: "NUMBER", widgetType: "CHART", thresholdMax: 60 },
          ]),
          isPublic: true,
          createdById: admin.id,
        },
        {
          name: "Weather Station",
          description: "Outdoor weather monitoring with pressure, UV, rain, and wind speed sensors.",
          department: "Computer Science",
          projectType: "HYBRID",
          technologyStack: ["ESP32", "BME280", "UV Sensor", "Rain Gauge", "React", "Chart.js"],
          telemetryPresets: JSON.stringify([
            { fieldName: "temperature", label: "Temperature", unit: "°C", dataType: "NUMBER", widgetType: "GAUGE" },
            { fieldName: "pressure", label: "Pressure", unit: "hPa", dataType: "NUMBER", widgetType: "VALUE" },
            { fieldName: "uvIndex", label: "UV Index", dataType: "NUMBER", widgetType: "GAUGE", thresholdMax: 11 },
            { fieldName: "rainfall", label: "Rainfall", unit: "mm", dataType: "NUMBER", widgetType: "CHART" },
            { fieldName: "windSpeed", label: "Wind Speed", unit: "km/h", dataType: "NUMBER", widgetType: "CHART" },
          ]),
          isPublic: true,
          createdById: admin.id,
        },
      ],
    });
    console.log("✅ Project templates seeded");
  }

  // ── Demo Competition ─────────────────────────────────────
  const compCount = await prisma.competition.count();
  if (compCount === 0) {
    await prisma.competition.create({
      data: {
        name: "SIH 2025 — Smart India Hackathon",
        organizer: "AICTE & Ministry of Education",
        description: "India's biggest hackathon — build innovative solutions for real-world problems.",
        website: "https://sih.gov.in",
        deadline: new Date("2025-09-15"),
        isActive: true,
      },
    });
    console.log("✅ Demo competition seeded");
  }

  console.log("\n✅ Database seeded successfully!");
  console.log("─────────────────────────────────────────");
  console.log("Demo credentials:");
  console.log("  Student  → PU-STU-001 / student123");
  console.log("  Faculty  → PU-FAC-001 / faculty123");
  console.log("  Admin    → PU-ADM-001 / admin123");
  console.log("─────────────────────────────────────────");
}

main()
  .catch((e) => { console.error("❌ Seed failed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
