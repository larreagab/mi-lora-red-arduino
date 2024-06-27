#include <SoftwareSerial.h>
SoftwareSerial LA66_serial_port(10, 11);
void setup()
{
   Serial.begin(9600); Serial.println('\n'); Serial.flush();
  LA66_serial_port.begin(9600);
}

void loop()
{
    sendMessage(1, "hello world", 0, 3);
    delay(5000);
	
}
void sendATCommand(String command) {
  LA66_serial_port.print(command + '\n');
  Serial.println("Sent Command: " + command); Serial.flush();
  readResponse();
}

void readResponse() {
  char inChar;
  while(true) {
    if(LA66_serial_port.available()) {
      inChar = (char)LA66_serial_port.read();
      Serial.print(inChar); Serial.flush();
    }
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
