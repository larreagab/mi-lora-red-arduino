#include <SPI.h>
#include <RF24.h>
#include <RF24Network.h>
#include <RF24Mesh.h>
#include <DHT.h>
#include <RTClib.h>
#include <BH1750.h>
#include <LowPower.h>

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

// Pin para la alarma
const int alarmPin = 3;    // Pin para la alarma del RTC
const int outputPin = 4;   // Pin para activar al despertar
volatile bool alarmFlag = false;

// Estructura para enviar los datos del sensor
struct SensorData {
    uint8_t nodeId;        // ID del nodo
    float humidity;
    float temperature;
    int moistureLevel;
    int16_t luminosity;    // Luminosidad (lux)
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

// Función de interrupción para manejar la alarma
void onAlarm() {
    alarmFlag = true;
}

// Configurar la alarma para el próximo intervalo de 30 segundos
void configureAlarm() {
    DateTime now = rtc.now();
    int nextSecond = (now.second() < 30) ? 30 : 0;
    int nextMinute = (now.second() < 30) ? now.minute() : (now.minute() + 1) % 60;

    rtc.clearAlarm(1); // Limpia la alarma 1
    rtc.clearAlarm(2); // Limpia la alarma 2 (si se ha utilizado)

    if (!rtc.setAlarm1(DateTime(now.year(), now.month(), now.day(), now.hour(), nextMinute, nextSecond), DS3231_A1_Second)) {
        Serial.println("Error, la alarma no se pudo configurar!");
    } else {
        Serial.println("La alarma se configuró para el próximo intervalo de 30 segundos.");
    }
}

void setup() {
    Serial.begin(9600);
    dht.begin();
    Wire.begin(); 
    lightMeter.begin();

    pinMode(rainSensorPin, INPUT);
    pinMode(alarmPin, INPUT_PULLUP); // Configurar el pin de alarma como entrada con pull-up
    pinMode(outputPin, OUTPUT); // Configurar el pin 4 como salida

    if (!rtc.begin()) {
        Serial.println("No se encontró el RTC DS3231");
        while (1);
    }

    mesh.setNodeID(0); // ID único para este nodo
    data.nodeId = 2;   // Configura el ID del nodo en la estructura
    mesh.begin();

    // Configurar la alarma para que se active en 30 segundos
    configureAlarm();

    // Adjuntar la interrupción para manejar la alarma
    attachInterrupt(digitalPinToInterrupt(alarmPin), onAlarm, FALLING);
}

void loop() {
    if (alarmFlag) {
        alarmFlag = false;

        // Activar el pin 4 al despertar
        digitalWrite(outputPin, HIGH);
        Serial.println("Alarma activada! Realizando tareas...");

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

        // Crear un buffer para los datos del sensor
        byte dataBuffer[sizeof(SensorData)];
        memcpy(dataBuffer, &data, sizeof(SensorData));

        // Envío de datos del sensor a través de la red mesh
        if (millis() - lastSentTime > 2000) {
            lastSentTime = millis();
            mesh.write(dataBuffer, 'M', sizeof(dataBuffer));
        }

        // Muestra los datos del sensor y la fecha y hora en el monitor serial
        DateTime now = rtc.now();
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

        // Reconfigurar la alarma para el siguiente intervalo de 30 segundos
        configureAlarm();

        // Esperar un momento antes de desactivar el pin
        delay(1000);
        digitalWrite(outputPin, LOW);

        Serial.println("Volviendo a dormir...");
    }

    // Asegurarse de que no haya datos pendientes de ser enviados por Serial antes de dormir
    Serial.flush();

    // Mostrar mensaje antes de dormir
    Serial.println("Durmiendo... Esperando la alarma para despertar.");

    // Poner al Arduino en modo de bajo consumo
    LowPower.powerDown(SLEEP_FOREVER, ADC_OFF, BOD_OFF);

    // Esto se ejecutará al despertar
    Serial.println("Despierto!");

    // Esperar un momento antes de volver a dormir
    delay(1000);
}
