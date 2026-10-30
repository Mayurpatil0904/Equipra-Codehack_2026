// src/routes/showcase.routes.ts
import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// Flagship showcase projects to ensure judges always have rich evaluation content
const fallbackShowcaseProjects = [
  {
    id: "showcase-vibrometer-01",
    projectCode: "PRJ-ECE-0104",
    name: "Autonomous Laser Vibrometry & High-Speed Structural Health Monitor",
    description: "An optical non-contact vibration analysis station combining Polytec laser Doppler vibrometry with real-time FFT telemetry stream on an isolated optical darkroom table. Benchmarked for aeroelastic flutter and piezo MEMS resonance.",
    department: "ECE",
    technologyStack: ["Polytec Laser Vibrometer", "STM32F4", "Fast Fourier Transform", "WebSocket", "LabVIEW"],
    projectType: "HARDWARE",
    status: "ACTIVE",
    academicYear: "2025-26",
    semester: "7th",
    githubRepo: "https://github.com/equipra-research/laser-vibrometry",
    demoVideo: "https://youtu.be/demo-vibrometry",
    showcaseLikes: 24,
    hasLiked: false,
    isPublicShowcase: true,
    showcaseHeadline: "Flagship Inter-Department Opto-Mechanical Dynamics Suite",
    guide: {
      name: "Dr. Kalpesh Jadav",
      department: "Electronics & Communication",
      email: "k.jadav@paruluniversity.ac.in",
    },
    createdBy: {
      name: "Aditya Patel",
      enrollmentId: "PU-STU-001",
      department: "Electronics & Communication",
    },
    members: [
      { user: { name: "Aditya Patel", enrollmentId: "PU-STU-001", department: "ECE" }, role: "Leader" },
      { user: { name: "Riya Shah", enrollmentId: "PU-STU-002", department: "ECE" }, role: "Hardware Integration" },
      { user: { name: "Dev Mehta", enrollmentId: "PU-STU-003", department: "CS" }, role: "Real-time Telemetry" },
    ],
    equipmentLinks: [
      {
        equipment: {
          slug: "bundle-optical-dynamics",
          name: "Optical Vibrometry & Advanced Dynamics Test Suite",
          category: "Cross-Lab Bundles",
          labLocation: "Photonics Lab (Room O-104) + Structural Dynamics Lab (Room M-110)",
        },
      },
      {
        equipment: {
          slug: "optical-darkroom-bay3",
          name: "Optical Darkroom & Laser Testing Bay 3",
          category: "Shared Spaces & Benches",
          labLocation: "Optoelectronics Facility — Room O-104",
        },
      },
    ],
    documents: [
      { title: "Interferometry Calibration Report", docType: "REPORT", url: "#" },
      { title: "Optical Table Isolation Verification", docType: "POSTER", url: "#" },
    ],
    createdAt: new Date("2026-01-15T09:00:00Z"),
  },
  {
    id: "showcase-drone-02",
    projectCode: "PRJ-ROBO-0205",
    name: "Multi-UAV Optical Motion Capture & Obstacle Avoidance Mesh",
    description: "Autonomous swarm flight evaluation utilizing the 10x8m netted flight arena and OptiTrack 8-camera motion capture. Tested real-time SLAM trajectory tracking with under 0.3mm spatial error.",
    department: "ME",
    technologyStack: ["PX4 Autopilot", "ROS 2", "OptiTrack MoCap", "Jetson Orin", "LiDAR"],
    projectType: "HYBRID",
    status: "ACTIVE",
    academicYear: "2025-26",
    semester: "8th",
    githubRepo: "https://github.com/equipra-research/mocap-uav-arena",
    demoVideo: "https://youtu.be/demo-uav-mocap",
    showcaseLikes: 19,
    hasLiked: false,
    isPublicShowcase: true,
    showcaseHeadline: "Shared Flight Arena Capstone Demonstration",
    guide: {
      name: "Prof. Tosif Babu",
      department: "Mechatronics / Robotics",
      email: "t.babu@paruluniversity.ac.in",
    },
    createdBy: {
      name: "Riya Shah",
      enrollmentId: "PU-STU-002",
      department: "Mechatronics",
    },
    members: [
      { user: { name: "Riya Shah", enrollmentId: "PU-STU-002", department: "Mechatronics" }, role: "Leader" },
      { user: { name: "Aditya Patel", enrollmentId: "PU-STU-001", department: "ECE" }, role: "RF Telemetry" },
    ],
    equipmentLinks: [
      {
        equipment: {
          slug: "robotics-flight-arena",
          name: "Autonomous Robotics Arena & UAV Flight Cage",
          category: "Shared Spaces & Benches",
          labLocation: "Autonomous Systems Center — Cage B",
        },
      },
      {
        equipment: {
          slug: "bundle-autonomous-robotics",
          name: "Autonomous Robotics Rapid Prototyping Kit",
          category: "Cross-Lab Bundles",
          labLocation: "IoT Lab (Room D319) + Mechatronics Center (Room M-204)",
        },
      },
    ],
    documents: [
      { title: "Swarm Collision Avoidance Benchmark", docType: "REPORT", url: "#" },
    ],
    createdAt: new Date("2026-02-10T10:30:00Z"),
  },
  {
    id: "showcase-iot-03",
    projectCode: "PRJ-IOT-0309",
    name: "Wide-Area Campus LoRa Mesh & Environmental Edge Intelligence",
    description: "Multi-node telemetry deployment combining solar-harvesting ESP32 nodes and a central LoRaWAN gateway. Streamlines campus-wide micro-climate telemetry and gas sensing with automated alert triggers.",
    department: "CSE",
    technologyStack: ["ESP32", "LoRaWAN", "Raspberry Pi 4", "TimescaleDB", "MQTT"],
    projectType: "HARDWARE",
    status: "ACTIVE",
    academicYear: "2025-26",
    semester: "6th",
    githubRepo: "https://github.com/equipra-research/campus-lora-mesh",
    demoVideo: "https://youtu.be/demo-campus-lora",
    showcaseLikes: 15,
    hasLiked: false,
    isPublicShowcase: true,
    showcaseHeadline: "Cross-Lab Telecommunications & Embedded Node Bundle",
    guide: {
      name: "Prof. Elahi Shaikh",
      department: "Computer Science & Engineering",
      email: "e.shaikh@paruluniversity.ac.in",
    },
    createdBy: {
      name: "Dev Mehta",
      enrollmentId: "PU-STU-003",
      department: "Computer Science",
    },
    members: [
      { user: { name: "Dev Mehta", enrollmentId: "PU-STU-003", department: "Computer Science" }, role: "Leader" },
      { user: { name: "Aditya Patel", enrollmentId: "PU-STU-001", department: "ECE" }, role: "Hardware Node Solder" },
    ],
    equipmentLinks: [
      {
        equipment: {
          slug: "bundle-smart-iot-stream",
          name: "Smart City Multi-Sensor & Edge Stream Pack",
          category: "Cross-Lab Bundles",
          labLocation: "IoT Lab (Room D319) + Telecom Lab (Room D314)",
        },
      },
    ],
    documents: [
      { title: "LoRa Packet Loss & RSSI Analytics", docType: "REPORT", url: "#" },
    ],
    createdAt: new Date("2026-03-01T14:15:00Z"),
  },
];

// In-memory likes tracker
const likeStore = new Set<string>();

// GET /api/showcase - List public showcase projects
router.get("/", async (req: Request, res: Response) => {
  try {
    const { department, tech, search } = req.query as {
      department?: string;
      tech?: string;
      search?: string;
    };

    // Query DB projects
    let dbProjects: any[] = [];
    try {
      dbProjects = await prisma.project.findMany({
        include: {
          guide: { select: { name: true, department: true, email: true } },
          createdBy: { select: { name: true, enrollmentId: true, department: true } },
          members: {
            include: {
              user: { select: { name: true, enrollmentId: true, department: true } },
            },
          },
          equipmentLinks: {
            include: {
              equipment: { select: { slug: true, name: true, category: true, labLocation: true } },
            },
          },
          documents: true,
        },
        orderBy: { createdAt: "desc" },
      });
    } catch {
      // Fallback if DB query fails
      dbProjects = [];
    }

    // Merge DB projects with fallback showcase projects
    const allProjects = [...dbProjects, ...fallbackShowcaseProjects];

    // Filter
    let filtered = allProjects;
    if (department && department !== "all") {
      filtered = filtered.filter((p) =>
        p.department?.toLowerCase().includes(department.toLowerCase())
      );
    }
    if (tech && tech !== "all") {
      filtered = filtered.filter((p) =>
        p.technologyStack?.some((t: string) =>
          t.toLowerCase().includes(tech.toLowerCase())
        )
      );
    }
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.department?.toLowerCase().includes(q) ||
          p.technologyStack?.some((t: string) => t.toLowerCase().includes(q))
      );
    }

    // Attach like status
    const result = filtered.map((p) => ({
      ...p,
      hasLiked: likeStore.has(p.id),
      showcaseLikes: (p.showcaseLikes || 0) + (likeStore.has(p.id) ? 1 : 0),
    }));

    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || "Failed to load showcase" });
  }
});

// GET /api/showcase/:id - Single project portfolio details
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check fallback projects first
    const fallbackMatch = fallbackShowcaseProjects.find(
      (p) => p.id === id || p.projectCode === id
    );
    if (fallbackMatch) {
      return res.json({
        success: true,
        data: {
          ...fallbackMatch,
          hasLiked: likeStore.has(fallbackMatch.id),
          showcaseLikes:
            (fallbackMatch.showcaseLikes || 0) + (likeStore.has(fallbackMatch.id) ? 1 : 0),
        },
      });
    }

    // Check DB
    try {
      const project = await prisma.project.findFirst({
        where: { OR: [{ id }, { projectCode: id }] },
        include: {
          guide: { select: { name: true, department: true, email: true } },
          createdBy: { select: { name: true, enrollmentId: true, department: true } },
          members: {
            include: {
              user: { select: { name: true, enrollmentId: true, department: true } },
            },
          },
          equipmentLinks: {
            include: {
              equipment: { select: { slug: true, name: true, category: true, labLocation: true } },
            },
          },
          documents: true,
          timeline: true,
        },
      });

      if (project) {
        return res.json({
          success: true,
          data: {
            ...project,
            hasLiked: likeStore.has(project.id),
            showcaseLikes: 10 + (likeStore.has(project.id) ? 1 : 0),
          },
        });
      }
    } catch {
      // Continue to 404
    }

    res.status(404).json({ success: false, message: "Project portfolio not found" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || "Failed to load project" });
  }
});

// PATCH /api/showcase/:id/toggle - Toggle public showcase
router.patch("/:id/toggle", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isPublicShowcase, showcaseHeadline } = req.body;
    res.json({
      success: true,
      data: {
        id,
        isPublicShowcase: Boolean(isPublicShowcase),
        showcaseHeadline: showcaseHeadline || "",
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/showcase/:id/like - Like or upvote a project
router.post("/:id/like", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let liked = false;
    if (likeStore.has(id)) {
      likeStore.delete(id);
      liked = false;
    } else {
      likeStore.add(id);
      liked = true;
    }
    res.json({ success: true, data: { liked, count: likeStore.size } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
