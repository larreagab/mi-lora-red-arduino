#include <Wire.h>
#include <RTClib.h>
#include <esp_sleep.h>
#include <WiFi.h>
#include <NTPClient.h>
#include <WiFiUdp.h>
#include <SPI.h>
#include <RF24.h>
#include <RF24Network.h>
#include <RF24Mesh.h>

// Configuración del NRF24L01
RF24 radio(5, 17); // CE, CSN pins
RF24Network network(radio);
RF24Mesh mesh(radio, network);

const char* ssid = "CONEXI?N ESPACIO";
const char* password = "J24J44S5e0OI1l";

WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", -18000); // Zona horaria de Ecuador (UTC-5 horas)
RTC_DS3231 rtc;

// Estructuras para los datos de los sensores y la hora
struct SensorData {
    uint8_t nodeId;
    float humidity;
    float temperature;
    int16_t moistureLevel;
    int16_t luminosity;
    int16_t rainLevel;
};

struct SensorDataOptimized {
    uint8_t nodeId;           // 1 byte
    int16_t humidity;         // 2 bytes (multiplicado por 100)
    int16_t temperature;      // 2 bytes (multiplicado por 100)
    int16_t moistureLevel;    // 2 bytes
    int16_t luminosity;       // 2 bytes (multiplicado por 10)
    int16_t rainLevel;        // 2 bytes
} __attribute__((packed));

struct TimeData {
    uint16_t year;
    uint8_t month;
    uint8_t day;
    uint8_t hour;
    uint8_t minute;
    uint8_t second;
};

// El pin que está conectado a SQW/INT
#define CLOCK_INTERRUPT_PIN GPIO_NUM_34

unsigned long previousMillis = 0; // Variable para almacenar la última vez que se actualizó la hora
const long interval = 15000; // Intervalo para actualizar la hora (15 segundos = 15000 milisegundos)

void setup() {
    Serial.begin(9600);
    Serial1.begin(9600);
    mesh.setNodeID(0); // Gateway es el nodo 0
    Serial.println("Conectando a WiFi...");
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println("\nWiFi conectado");

    // Inicializa el cliente NTP y el DS3231
    Serial.println("Iniciando NTP y RTC...");
    timeClient.begin();
    if (!rtc.begin()) {
        Serial.println("No se encontró el RTC");
        while (1);
    }
    Serial.println("Iniciando RF24Mesh...");
    mesh.begin();
    delay(4000);
    
    // Verificar la causa del despertar
    esp_sleep_wakeup_cause_t wakeup_reason = esp_sleep_get_wakeup_cause();
    if (wakeup_reason == ESP_SLEEP_WAKEUP_EXT0) {
        Serial.println("Despertado por la alarma del RTC");
        onAlarm();
    } else {
        Serial.println("Inicializando el sistema");
    }

    // Inicializar el RTC
    if (!rtc.begin()) {
        Serial.println("Couldn't find RTC!");
        Serial.flush();
        while (1) delay(10);
    }

    if (rtc.lostPower()) {
        // Ajustar la fecha y hora a la compilación
        Serial.println("RTC perdió la hora, obteniendo hora de NTP");
        timeClient.update();
        rtc.adjust(DateTime(timeClient.getEpochTime()));
    }

    // Deshabilitar el pin 32K
    rtc.disable32K();

    // Configurar el pin de interrupción
    pinMode(CLOCK_INTERRUPT_PIN, INPUT_PULLUP);
    esp_sleep_enable_ext0_wakeup(CLOCK_INTERRUPT_PIN, 0);  // Configurar para despertar con el pin CLOCK_INTERRUPT_PIN

    // Borrar las alarmas anteriores
    rtc.clearAlarm(1);
    rtc.clearAlarm(2);

    // Detener las señales oscilantes en el pin SQW
    rtc.writeSqwPinMode(DS3231_OFF);

    // Deshabilitar la alarma 2
    rtc.disableAlarm(2);

    // Programar una alarma para 2 minutos en el futuro
    if (!rtc.setAlarm1(
            rtc.now() + TimeSpan(0, 0, 1, 0),  // 2 minutos en el futuro
            DS3231_A1_Minute // Este modo activa la alarma cuando los minutos coinciden
        )) {
        Serial.println("Error, alarm wasn't set!");
    } else {
        Serial.println("Alarm will happen in 2 minutes!");
    }

    // Inicializa la conexión WiFi
    

    

    

    Serial.println("Entrando en modo deep sleep...");
    delay(1000);  // Esperar un momento para asegurarse de que el mensaje se envíe al monitor serie
    esp_deep_sleep_start();  // Entrar en modo deep sleep
}

void loop() {
    // Este código no se ejecutará ya que el ESP32 se reinicia después de despertar del deep sleep
}

void onAlarm() {

        // Actualizar y mostrar la hora
    actualizarYMostrarHora();
    

    mesh.update();
    mesh.DHCP();

    // Continuación de la función loop()
    while (network.available()) {
        RF24NetworkHeader header;
        network.peek(header);

       if (header.type == 'M') { // 'M' representa los datos del sensor
            byte dataBuffer[sizeof(SensorData)];
            if (network.read(header, &dataBuffer, sizeof(dataBuffer))) {
                SensorData data;
                
                // Desempaquetar el nodeId
                memcpy(&data.nodeId, dataBuffer, sizeof(data.nodeId));
                
                // Desempaquetar la humedad
                memcpy(&data.humidity, dataBuffer + sizeof(data.nodeId), sizeof(data.humidity));
                
                // Desempaquetar la temperatura
                memcpy(&data.temperature, dataBuffer + sizeof(data.nodeId) + sizeof(data.humidity), sizeof(data.temperature));
                
                // Desempaquetar el nivel de humedad del suelo
                memcpy(&data.moistureLevel, dataBuffer + sizeof(data.nodeId) + sizeof(data.humidity) + sizeof(data.temperature), sizeof(data.moistureLevel));
                
                // Desempaquetar la luminosidad
                memcpy(&data.luminosity, dataBuffer + sizeof(data.nodeId) + sizeof(data.humidity) + sizeof(data.temperature) + sizeof(data.moistureLevel), sizeof(data.luminosity));
                
                // Desempaquetar el nivel de lluvia
                memcpy(&data.rainLevel, dataBuffer + sizeof(data.nodeId) + sizeof(data.humidity) + sizeof(data.temperature) + sizeof(data.moistureLevel) + sizeof(data.luminosity), sizeof(data.rainLevel));
                

                // Mostrar los datos en el monitor serial
                printData(data);

                // Procesar y enviar los datos optimizados al Arduino UNO
                SensorDataOptimized optimizedData = procesarDatos(data);
                enviarDatosSensores(optimizedData);
            } else {
                Serial.println("Error en la recepción de datos");
            }
        }
    }
    

       
    

    // Reprogramar la alarma para 2 minutos en el futuro
    
}

void actualizarYMostrarHora() {
    // Actualizar y mostrar la hora
    timeClient.update();
    DateTime now = rtc.now();
    Serial.print("Hora actual: ");
    Serial.print(now.year(), DEC);
    Serial.print('/');
    Serial.print(now.month(), DEC);
    Serial.print('/');
    Serial.print(now.day(), DEC);
    Serial.print(" ");
    Serial.print(now.hour(), DEC);
    Serial.print(':');
    Serial.print(now.minute(), DEC);
    Serial.print(':');
    Serial.println(now.second(), DEC);
    // Envía la hora actualizada al nodo
    TimeData timeData = {now.year(), now.month(), now.day(), now.hour(), now.minute(), now.second()};
    byte timeBuffer[sizeof(TimeData)];
    memcpy(timeBuffer, &timeData, sizeof(TimeData));
    bool ok = mesh.write(timeBuffer, 'T', sizeof(timeBuffer)); // 'T' representa Time Update
    if (ok) {
        Serial.println("Hora actualizada enviada a los nodos.");
    } else {
        Serial.println("Error al enviar la hora al nodo");
    }
}

void enviarDatosSensores(SensorDataOptimized data) {
    // Encabezado específico para indicar el inicio de los datos
    const char encabezado[] = "DATA_START";
    Serial1.write(encabezado, sizeof(encabezado));

    // Asegurar que el Arduino Uno tenga tiempo de procesar el encabezado
    delay(50);

    // Enviar datos de los sensores a través de la interfaz serial
    byte dataBuffer[sizeof(SensorDataOptimized)];
    memcpy(dataBuffer, &data, sizeof(SensorDataOptimized));
    Serial1.write(dataBuffer, sizeof(SensorDataOptimized));

    delay(1000);  // Tiempo para que el Arduino Uno procese los datos
}


SensorDataOptimized procesarDatos(SensorData data) {
    SensorDataOptimized optimizedData;
    optimizedData.nodeId = data.nodeId;
    optimizedData.humidity = data.humidity * 100;         // Multiplicar por 100
    optimizedData.temperature = data.temperature * 100;   // Multiplicar por 100
    optimizedData.moistureLevel = data.moistureLevel;
    optimizedData.luminosity = data.luminosity;      // Multiplicar por 10
    optimizedData.rainLevel = data.rainLevel;
    return optimizedData;
}

void printData(SensorData data) {
    Serial.print("nodeId: ");
    Serial.print(data.nodeId);
    Serial.print(", humidity: ");
    Serial.print(data.humidity);
    Serial.print("%, temperature: ");
    Serial.print(data.temperature);
    Serial.print("°C, moistureLevel: ");
    Serial.print(data.moistureLevel);
    Serial.print(", luminosity: ");
    Serial.print(data.luminosity);
    Serial.print(" lux, rainLevel: ");
    Serial.println(data.rainLevel);
}