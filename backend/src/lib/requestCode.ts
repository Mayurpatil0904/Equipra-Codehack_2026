import prisma from "./prisma";

export async function nextRequestCode(): Promise<string> {
  const counter = await prisma.counter.upsert({
    where:  { id: "request_code" },
    update: { value: { increment: 1 } },
    create: { id: "request_code", value: 1 },
  });
  return "REQ" + String(counter.value).padStart(5, "0");
}

export async function nextEquipmentId(): Promise<string> {
  const counter = await prisma.counter.upsert({
    where:  { id: "equipment_id" },
    update: { value: { increment: 1 } },
    create: { id: "equipment_id", value: 1 },
  });
  return "EQ-" + String(counter.value).padStart(4, "0");
}

// ✅ NEW — sequential project codes: PRJ-0001, PRJ-0002, ...
export async function nextProjectCode(): Promise<string> {
  const counter = await prisma.counter.upsert({
    where:  { id: "project_code" },
    update: { value: { increment: 1 } },
    create: { id: "project_code", value: 1 },
  });
  return "PRJ-" + String(counter.value).padStart(4, "0");
}

// ✅ NEW — sequential device codes: DEV-0001, DEV-0002, ...
export async function nextDeviceCode(): Promise<string> {
  const counter = await prisma.counter.upsert({
    where:  { id: "device_code" },
    update: { value: { increment: 1 } },
    create: { id: "device_code", value: 1 },
  });
  return "DEV-" + String(counter.value).padStart(4, "0");
}
