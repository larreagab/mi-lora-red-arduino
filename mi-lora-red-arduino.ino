#include <SoftwareSerial.h>
#include <EEPROM.h>

// Definición del puerto serial para LoRa
SoftwareSerial LA66_serial_port(10, 11); // RX, TX para LoRa

// Estructura para los datos del sensor
struct SensorDataOptimized {
    int8_t nodeId;           // 1 byte
    int16_t humidity;        // 2 bytes (multiplicado por 100)
    int16_t temperature;     // 2 bytes (multiplicado por 100)
    int16_t moistureLevel;   // 2 bytes
    int16_t luminosity;      // 2 bytes 
    int16_t rainLevel;       // 2 bytes
};

// Variables de estado
bool esperandoDatos = false;
const char encabezado[] = "DATA_START";
const size_t encabezadoSize = sizeof(encabezado);

const int eepromStartAddress = 0;  // Dirección de inicio en la EEPROM
int currentEepromAddress = eepromStartAddress;

void setup() {
  Serial.begin(9600);    // Comunicación serial para el monitor serial y ESP32
  LA66_serial_port.begin(9600); // Comunicación serial con LoRa
  Serial.println('\n'); 
  Serial.flush();
}

void loop() {
  static size_t encabezadoIndex = 0;
  //borrarEEPROM();
  if (Serial.available()) {
    if (!esperandoDatos) {
      char c = Serial.read();
      if (c == encabezado[encabezadoIndex]) {
        encabezadoIndex++;
        if (encabezadoIndex == encabezadoSize) {
          esperandoDatos = true;
          encabezadoIndex = 0;
          Serial.println("Preparado para recibir datos.");
        }
      } else {
        encabezadoIndex = 0;  // Reiniciar si no coincide
      }
    } else if (Serial.available() >= sizeof(SensorDataOptimized)) {
      SensorDataOptimized data;
      Serial.readBytes((uint8_t*)&data, sizeof(SensorDataOptimized)); // Leer los bytes y convertirlos de vuelta a la estructura

      // Mostrar los datos en el monitor serial
      Serial.print("Node ID: ");
      Serial.print(data.nodeId);
      Serial.print(", Humidity: ");
      Serial.print(data.humidity / 100.0);
      Serial.print("%, Temperature: ");
      Serial.print(data.temperature / 100.0);
      Serial.print("°C, Moisture Level: ");
      Serial.print(data.moistureLevel);
      Serial.print(", Luminosity: ");
      Serial.print(data.luminosity);
      Serial.print(" lux, Rain Level: ");
      Serial.println(data.rainLevel);
      contarEstructurasEEPROM();
      // Guardar los datos en la EEPROM
      guardarDatosEnEEPROM(data);
      // Enviar los datos a través de LoRa
      enviarDatosLoRa(data);

      Serial.flush();

      esperandoDatos = false;  // Resetear la bandera para esperar el próximo encabezado
    }
  }

  // Verificar si hay datos recibidos del LoRa
  if (LA66_serial_port.available()) {
    String mensajeRecibido = readLoRaMessage();
    String comando = procesarMensaje(mensajeRecibido);
    
    if (comando == "REQUESTDATA") {
      enviarDatosGuardadosEEPROM();
    } else if (comando == "BUSCANDORED") {
      sendMessage(1, "BUSCANDO_RED_OK", 0, 0);
      delay(200);
      Serial.println("mensaje enviado");
    } 
    else if (comando == "CONEXIONEXITOSA") {
      sendMessage(1, "CONEXIONEXITOSA", 0, 0);
      delay(200);
      Serial.println("mensaje enviado");
    }
    else if (comando == "COMENZARTRANSMISION") {
      sendMessage(1, "COMENZAR_TRANSMISION_OK", 0, 0);
      delay(200);
      Serial.println("mensaje enviado");
    }
    else {
      Serial.println("Mensaje recibido: " + comando);
      delay(200);
    }
  }
  
  delay(100); // Ajusta el tiempo según tus necesidades
}

void guardarDatosEnEEPROM(SensorDataOptimized data) {
  // Calcular la dirección de fin para verificar si hay espacio suficiente
  int endAddress = currentEepromAddress + sizeof(SensorDataOptimized);
  Serial.println(endAddress);

  // Verificar si hay espacio suficiente en la EEPROM
  if (endAddress <= EEPROM.length()) {
    // Escribir los datos en la EEPROM
    for (size_t i = 0; i < sizeof(SensorDataOptimized); i++) {
      EEPROM.write(currentEepromAddress + i, *((byte*)&data + i));
    }

    // Actualizar la dirección actual
    currentEepromAddress = endAddress;

    Serial.println("Datos guardados en la EEPROM.");
  } else {
    Serial.println("No hay suficiente espacio en la EEPROM para almacenar los datos.");
  }
}

void enviarDatosLoRa(SensorDataOptimized data) {
  if (estructuraDiferenteDeCero(data)) {  // Verificar si la estructura no está vacía
    String contenido = String(data.nodeId) + "a" +
                       String(data.humidity) + "a" +
                       String(data.temperature) + "a" +
                       String(data.moistureLevel) + "a" +
                       String(data.luminosity) + "a" +
                       String(data.rainLevel);
    sendMessage(1, contenido, 0, 0);
  }
}

void sendATCommand(String command) {
  LA66_serial_port.print(command + '\n');
  Serial.println("Sent Command: " + command); Serial.flush();
  readResponse();
}

void readResponse() {
  char inChar;

  while (LA66_serial_port.available()) {
    inChar = (char)LA66_serial_port.read();
    Serial.print(inChar); Serial.flush();
  }
  Serial.println();
}



void borrarEEPROM() {
  // Recorrer todas las direcciones de la EEPROM
  for (int i = 0; i < EEPROM.length(); i++) {
    EEPROM.write(i, 0);  // Escribir 0 en cada dirección
  }
}

bool estructuraDiferenteDeCero(SensorDataOptimized data) {
  return data.nodeId != 0 || 
         data.humidity != 0 || 
         data.temperature != 0 || 
         data.moistureLevel != 0 || 
         data.luminosity != 0 || 
         data.rainLevel != 0;
}

void contarEstructurasEEPROM() {
  int contador = 0;
  SensorDataOptimized data;
  for (int address = eepromStartAddress; address + sizeof(SensorDataOptimized) <= EEPROM.length(); address += sizeof(SensorDataOptimized)) {
    EEPROM.get(address, data);
    if (estructuraDiferenteDeCero(data)) {
      contador++;
    }
  }
  Serial.print("Número de estructuras diferentes de 0 en EEPROM: ");
  Serial.println(contador);
}

void enviarDatosGuardadosEEPROM() {
  SensorDataOptimized data;
  for (int address = eepromStartAddress; address + sizeof(SensorDataOptimized) <= EEPROM.length(); address += sizeof(SensorDataOptimized)) {
    EEPROM.get(address, data);
    if (estructuraDiferenteDeCero(data)) {  // Verificar si la estructura no está vacía
      enviarDatosLoRa(data);
      delay(1500);  // Pequeña pausa entre envíos
    }
  }
  sendMessage(1, "DATOSENVIADOS", 0, 0);
}

String readLoRaMessage() {
  String message = "";
  while (LA66_serial_port.available()) {
    char c = LA66_serial_port.read();
    message += c;
  }
  delay(3000);
  return message;
}

String procesarMensaje(String mensaje) {
  Serial.println(mensaje);

  // Buscar el índice de inicio del mensaje
  int startIndex = mensaje.indexOf("Data: (String: ) ");
  if (startIndex != -1) {
    startIndex += 17; // Ajustar el índice para el inicio de los datos

    // Buscar el índice del final del mensaje
    int endIndex = mensaje.indexOf("Rssi=", startIndex);
    if (endIndex == -1) {
      endIndex = mensaje.length();
    }
    
    // Extraer el mensaje
    String mensajeExtraido = mensaje.substring(startIndex, endIndex);
    mensajeExtraido.trim(); // Eliminar espacios en blanco

    // Verificar si el mensaje extraído no está vacío
    if (mensajeExtraido.length() > 0) {
      return mensajeExtraido;
    } else {
      return "Mensaje extraído está vacío.";
    }
  } else {
    return "No se encontró el inicio del mensaje.";
  }
}



void setBandwidth(int tx, int rx) {
  String command = "AT+BW=" + String(tx) + "," + String(rx);
  sendATCommand(command);
}

void setFrequency(float tx, float rx) {
  String command = "AT+FRE=" + String(tx) + "," + String(rx);
  sendATCommand(command);
}

void setSpreadingFactor(int tx, int rx) {
  String command = "AT+SF=" + String(tx) + "," + String(rx);
  sendATCommand(command);
}

void setPower(int power) {
  String command = "AT+POWER=" + String(power);
  sendATCommand(command);
}

void setCodingRate(int tx, int rx) {
  String command = "AT+CR=" + String(tx) + "," + String(rx);
  sendATCommand(command);
}

void setHeaderType(int tx, int rx) {
  String command = "AT+HEADER=" + String(tx) + "," + String(rx);
  sendATCommand(command);
}

void setCRCType(int tx, int rx) {
  String command = "AT+CRC=" + String(tx) + "," + String(rx);
  sendATCommand(command);
}

void setInvertIQ(int tx, int rx) {
  String command = "AT+IQ=" + String(tx) + "," + String(rx);
  sendATCommand(command);
}

void setPreambleLength(int tx, int rx) {
  String command = "AT+PREAMBLE=" + String(tx) + "," + String(rx);
  sendATCommand(command);
}

void setSyncword(int syncword) {
  String command = "AT+SYNCWORD=" + String(syncword);
  sendATCommand(command);
}

void setGroupMode(int tx, int rx) {
  String command = "AT+GROUPMOD=" + String(tx) + "," + String(rx);
  sendATCommand(command);
}

void setRXMode(unsigned int timeout, int ackMode) {
  String command = "AT+RXMOD=" + String(timeout) + "," + String(ackMode);
  sendATCommand(command);
}

void sendMessage(int format, String content, int ackMode, int retransmissions) {
  String command = "AT+SEND=" + String(format) + "," + content + "," + String(ackMode) + "," + String(retransmissions);
  sendATCommand(command);
}

void printLastMessage(int format) {
  String command = "AT+RECV=" + String(format);
  sendATCommand(command);
}
