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
bool timeReceived = false;  // Variable para rastrear si la hora ya ha sido recibida

// Función de interrupción para manejar la alarma
void onAlarm() {
    alarmFlag = true;
}

// Configurar la alarma para el próximo intervalo de 30 segundos
void configureAlarm(int intervalMinutes) {
    rtc.clearAlarm(1);
    rtc.clearAlarm(2);
    DateTime now = rtc.now();
    int totalMinutes = now.minute() + intervalMinutes;
    int nextHour = (now.hour() + totalMinutes / 60) % 24;
    int nextMinute = totalMinutes % 60;

    // Programar la alarma para el siguiente intervalo
    if (!rtc.setAlarm1(
            DateTime(now.year(), now.month(), now.day(), nextHour, nextMinute, 0), 
            DS3231_A1_Minute
        )) {
        Serial.println("Error, alarm wasn't set!");
    } else {
        Serial.print("Alarma programada para: ");
        Serial.print(nextHour);
        Serial.print(":");
        Serial.print(nextMinute);
        Serial.println();
    }
}


void setup() {
    Serial.begin(9600);
    alarmFlag = false;
    timeReceived=false;
    Serial.println("Inicializando dispositivo");
    pinMode(rainSensorPin, INPUT);
    pinMode(alarmPin, INPUT_PULLUP); // Configurar el pin de alarma como entrada con pull-up
    pinMode(outputPin, OUTPUT); // Configurar el pin 4 como salida
    digitalWrite(outputPin, LOW);

    if (!rtc.begin()) {
        Serial.println("No se encontró el RTC DS3231");
        while (1);
    }
    if (rtc.lostPower()) {
        Serial.println("RTC perdió energía, ajustando la hora...");
        rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
    }
    mesh.setNodeID(0); // ID único para este nodo
    data.nodeId = 2;   // Configura el ID del nodo en la estructura
    mesh.begin();

    // Borrar las alarmas anteriores
    rtc.clearAlarm(1);
    rtc.clearAlarm(2);
    rtc.disable32K();
    // Detener las señales oscilantes en el pin SQW
    rtc.writeSqwPinMode(DS3231_OFF);

    // Deshabilitar la alarma 2
    rtc.disableAlarm(2);

    // Configurar la alarma para que se active en 30 segundos
    //configureAlarm();
    
    // Adjuntar la interrupción para manejar la alarma
    attachInterrupt(digitalPinToInterrupt(alarmPin), onAlarm, FALLING);

    // Bucle de espera hasta recibir el mensaje de la hora
    while (!timeReceived) {
        mesh.update();
        mesh.DHCP();
        
        // Verificar si hay datos disponibles para recibir
        
        while (network.available()) {
            RF24NetworkHeader header;
            network.peek(header);

            if (header.type == 'T') { // 'T' indica actualización de tiempo
                TimeData timeDataR;
                if (network.read(header, &timeDataR, sizeof(timeDataR))) {
                    // Ajusta la hora en el DS3231
                    rtc.adjust(DateTime(timeDataR.year, timeDataR.month, timeDataR.day, timeDataR.hour, timeDataR.minute, timeDataR.second));
                    timeReceived = true;  // Marca la hora como recibida
                    Serial.println("Hora recibida y ajustada.");
                    byte confirmation = 1; // Confirmación simple
                    mesh.write(&confirmation, 'C', sizeof(confirmation));
                    //mesh.write(&confirmation, 'C', sizeof(confirmation));
                    //mesh.write(&confirmation, 'C', sizeof(confirmation));
                    //mesh.write(&confirmation, 'C', sizeof(confirmation));
                    //mesh.write(&confirmation, 'C', sizeof(confirmation));
                    Serial.println("Confirmación de recepción de hora enviada.");
                    
                }
            }
        }
    }

    
    DateTime now = rtc.now(); // Obtener la hora actual del RTC
  
  // Imprimir la fecha y hora en el formato deseado
  Serial.print(now.year(), DEC); // Año
  Serial.print('/');
  Serial.print(now.month(), DEC); // Mes
  Serial.print('/');
  Serial.print(now.day(), DEC); // Día
  Serial.print(" ");
  Serial.print(now.hour(), DEC); // Hora
  Serial.print(':');
  Serial.print(now.minute(), DEC); // Minuto
  Serial.print(':');
  Serial.print(now.second(), DEC); // Segundo
  Serial.println();
configureAlarm(1);
}

void loop() {
    if (alarmFlag) {
        digitalWrite(outputPin, HIGH);
        Wire.begin();
        lightMeter.begin();
        dht.begin();
        
        delay(200);
        alarmFlag = false;
        
        // Activar el pin 4 al despertar
        
        Serial.println("Alarma activada! Realizando tareas...");

        mesh.update();
        mesh.DHCP();

        // Lectura de los sensores
        data.humidity = dht.readHumidity();
        data.temperature = dht.readTemperature();
        data.moistureLevel = analogRead(moisturePin);
        data.luminosity = lightMeter.readLightLevel();
        data.rainLevel = analogRead(rainSensorPin);

        // Crear un buffer para los datos del sensor
        byte dataBuffer[sizeof(SensorData)];
        memcpy(dataBuffer, &data, sizeof(SensorData));
        delay(7600);
        
        // Envío de datos del sensor a través de la red mesh
        
        mesh.write(dataBuffer, 'M', sizeof(dataBuffer));
        
        
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
        configureAlarm(1);

        // Esperar un momento antes de desactivar el pin
        delay(1000);
        digitalWrite(outputPin, LOW);

        Serial.println("Volviendo a dormir...");
        //LowPower.powerDown(SLEEP_FOREVER, ADC_OFF, BOD_OFF);
    }

    // Asegurarse de que no haya datos pendientes de ser enviados por Serial antes de dormir
    Serial.flush();

    // Mostrar mensaje antes de dormir
    Serial.println("Durmiendo... Esperando la alarma para despertar.");
    radio.powerDown();
    // Poner al Arduino en modo de bajo consumo
    LowPower.powerDown(SLEEP_FOREVER, ADC_OFF, BOD_OFF);

    // Esto se ejecutará al despertar
    Serial.println("Despierto!");

    // Esperar un momento antes de volver a dormir
    
}
