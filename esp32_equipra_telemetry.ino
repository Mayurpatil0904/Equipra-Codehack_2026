/*
 * Equipra IoT — ESP32 Telemetry Client
 * Industrial Safety Monitoring System
 *
 * Replace the three #define values at the top with your actual:
 *   - WiFi credentials
 *   - API key from the Equipra "Add Device" modal
 *
 * This sketch reads DHT11 (temperature) and MQ sensor (gas level)
 * and POSTs the data to Equipra every 5 seconds.
 * Equipra's live dashboard will update automatically.
 *
 * Upload via Arduino IDE:
 *   Board  : ESP32 Dev Module
 *   Library: DHT sensor library by Adafruit
 *   Library: HTTPClient (built-in with ESP32 Arduino core)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>

// ─── CONFIG — fill these in ────────────────────────────────────
#define WIFI_SSID      "YourWiFiSSID"
#define WIFI_PASSWORD  "YourWiFiPassword"
#define EQUIPRA_KEY    "ek_paste_your_api_key_here"   // from Equipra Add Device modal
// ──────────────────────────────────────────────────────────────

#define EQUIPRA_URL    "https://backend-eqipra.onrender.com/api/telemetry"
#define SEND_INTERVAL  5000   // ms — send every 5 seconds

// ── Pin definitions (match your existing wiring) ───────────────
#define DHT_PIN        4      // DHT11 data pin
#define DHT_TYPE       DHT11
#define MQ_PIN         34     // MQ-2/MQ-5 analog output (ADC pin)
#define ZONE1_PIN      27     // RFID Zone 1 relay output
#define ZONE2_PIN      26     // RFID Zone 2 relay output

DHT dht(DHT_PIN, DHT_TYPE);
unsigned long lastSend = 0;

// ──────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("\n=== Equipra IoT Client — Industrial Safety System ===");
  Serial.println("Connecting to WiFi...");

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(1000);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\nWiFi connection failed. Restarting...");
    ESP.restart();
  }

  Serial.println("\nWiFi connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  dht.begin();
  Serial.println("DHT11 initialized.");
  Serial.println("Starting telemetry loop...\n");
}

// ──────────────────────────────────────────────────────────────
void loop() {
  unsigned long now = millis();
  if (now - lastSend < SEND_INTERVAL) return;
  lastSend = now;

  // Read sensors
  float temperature = dht.readTemperature();
  float humidity    = dht.readHumidity();
  int   gasLevel    = analogRead(MQ_PIN);   // 0–4095 (12-bit ADC)
  bool  zone1Active = digitalRead(ZONE1_PIN) == HIGH;
  bool  zone2Active = digitalRead(ZONE2_PIN) == HIGH;

  // Validate DHT reading
  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("DHT11 read failed — skipping this cycle.");
    return;
  }

  // Build JSON payload
  // Keys must match the field names you defined in Equipra's telemetry defs.
  // __ prefix fields are metadata stripped from the stored payload.
  String rssi = String(WiFi.RSSI());
  String ip   = WiFi.localIP().toString();

  String payload =
    String("{") +
    "\"temperature\":"  + String(temperature, 1) + "," +
    "\"humidity\":"     + String(humidity, 1)    + "," +
    "\"gasLevel\":"     + String(gasLevel)       + "," +
    "\"zone1Active\":"  + (zone1Active ? "true" : "false") + "," +
    "\"zone2Active\":"  + (zone2Active ? "true" : "false") + "," +
    "\"__wifi\":"       + rssi                   + "," +
    "\"__ip\":\""       + ip + "\"" +
    "}";

  Serial.print("Sending: ");
  Serial.println(payload);

  // Send to Equipra
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected — skipping.");
    return;
  }

  HTTPClient http;
  http.begin(EQUIPRA_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", EQUIPRA_KEY);
  http.setTimeout(8000);

  int code = http.POST(payload);

  if (code > 0) {
    String response = http.getString();
    Serial.print("Response [");
    Serial.print(code);
    Serial.print("]: ");
    Serial.println(response);
  } else {
    Serial.print("HTTP error: ");
    Serial.println(http.errorToString(code));
  }

  http.end();
}
