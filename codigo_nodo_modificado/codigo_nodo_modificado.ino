#include <SPI.h>
#include <RF24.h>
#include <RF24Network.h>
#include <RF24Mesh.h>
#include <DHT.h>
#include <RTClib.h>
#include <BH1750.h>

// Configuración del NRF24L01
RF24 radio(9, 10); // CE, CSN pins
RF24Network network(radio);
RF24Mesh mesh(radio, network);

// Configuración del sensor DHT11
DHT dht(2, DHT11); // Pin D2 para DHT11

// Configuración del DS3231
RTC_DS3231 rtc;

// Configuración de los sensores adicionales
int moisturePin = A1;      // Pin del sensor de humedad del suelo
int rainSensorPin = A2;    // Pin del sensor de lluvia
BH1750 lightMeter;         // Sensor de luminosidad BH1750

// Estructura para enviar los datos del sensor
struct SensorData {
    
    uint8_t nodeId;        // ID del nodo
    float humidity;
    float temperature;
    int moistureLevel;
    int16_t luminosity;      // Luminosidad (lux)
    int rainLevel;         // Nivel de lluvia
};

// Estructura para recibir datos de tiempo
struct TimeData {
    uint16_t year;
    uint8_t month;
    uint8_t day;
    uint8_t hour;
    uint8_t minute;
    uint8_t second;
};

SensorData data;
unsigned long lastSentTime;

void setup() {
    Serial.begin(9600);
    dht.begin();
    Wire.begin(); 
    lightMeter.begin();

    pinMode(rainSensorPin, INPUT);

    if (!rtc.begin()) {
        Serial.println("No se encontró el RTC DS3231");
        while (1);
    }

    mesh.setNodeID(0); // ID único para este nodo
    data.nodeId = 2;   // Configura el ID del nodo en la estructura
    mesh.begin();

    lastSentTime = millis();
}

void loop() {
    mesh.update();
    mesh.DHCP();

    // Verificar si hay datos disponibles para recibir
    while (network.available()) {
        RF24NetworkHeader header;
        network.peek(header);

        if (header.type == 'T') { // 'T' indica actualización de tiempo
            TimeData timeData;
            if (network.read(header, &timeData, sizeof(timeData))) {
                // Ajusta la hora en el DS3231
                rtc.adjust(DateTime(timeData.year, timeData.month, timeData.day, timeData.hour, timeData.minute, timeData.second));
            }
        }
    }

    // Lectura de los sensores
    data.humidity = dht.readHumidity();
    data.temperature = dht.readTemperature();
    data.moistureLevel = analogRead(moisturePin);
    data.luminosity = lightMeter.readLightLevel();
    data.rainLevel = analogRead(rainSensorPin);

    // Lectura de la hora y fecha del DS3231
    DateTime now = rtc.now();

    // Crear un buffer para los datos del sensor
    byte dataBuffer[sizeof(SensorData)];
    memcpy(dataBuffer, &data, sizeof(SensorData));

    // Envío de datos del sensor a través de la red mesh
    if (millis() - lastSentTime > 2000) {
        lastSentTime = millis();
        mesh.write(dataBuffer, 'M', sizeof(dataBuffer));
    }
    

    // Muestra los datos del sensor y la fecha y hora en el monitor serial
    Serial.print("Nodo: ");
    Serial.print(data.nodeId);
    Serial.print(", Humedad: ");
    Serial.print(data.humidity);
    Serial.print("%, Temperatura: ");
    Serial.print(data.temperature);
    Serial.print("°C, Humedad del Suelo: ");
    Serial.print(data.moistureLevel);
    Serial.print(", Luminosidad: ");
    Serial.print(data.luminosity);
    Serial.print(" lux, Nivel de Lluvia: ");
    Serial.print(data.rainLevel);
    Serial.print(", Fecha y Hora: ");
    Serial.print(now.year());
    Serial.print('/');
    Serial.print(now.month());
    Serial.print('/');
    Serial.print(now.day());
    Serial.print(" ");
    Serial.print(now.hour());
    Serial.print(':');
    Serial.print(now.minute());
    Serial.print(':');
    Serial.println(now.second());

    delay(1000);
}


