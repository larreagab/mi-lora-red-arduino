#include <SoftwareSerial.h> // built-in arduino library
String inputString = "\0"; // a String to hold incoming serial data
SoftwareSerial LA66_serial_port(10, 11); // Arduino RX, TX

void setup()
{
  // Initialize serial communications with arduino and LA66.
  // A known bug in arduino's IDE causes junk to be displayed in the first line.
  Serial.begin(9600); Serial.println('\n'); Serial.flush();
  LA66_serial_port.begin(9600);
  
  // clear transceiver buffer
  while (LA66_serial_port.available()) int dumpChar = LA66_serial_port.read();
}

void loop()
{
  char inChar = '\0'; // a single character read from a buffer

  // Get an AT command from the serial monitor
  Serial.println("\nEnter an AT command through the serial monitor"); Serial.flush();
  while( ! Serial.available()); // wait for the command to be entered
  inputString = "\0";
  while (Serial.available())  // read the command
  {
    // get a new byte:
    inChar = (char)Serial.read();
    //Serial.print(inChar); Serial.flush();

    // If the incoming character is a newline or carriage-return, dump the rest of the input buffer
    // Otherwise, add the character to the input string.
    if (inChar == '\n' || inChar == '\r') while (Serial.available()) Serial.read();
    else inputString += inChar;
    delay(5); // found pausing the software is necessary to allow time for the hardware to do its thing
  }

  // Semd the command to the transceiver
  LA66_serial_port.print(inputString + '\n');
  Serial.println("Sent Command: " + inputString); Serial.flush(); // display the command

  // Test ability to read the results from LA66
  while(true)
  {
    if(LA66_serial_port.available())
    {
      inChar = (char)LA66_serial_port.read();
      Serial.print(inChar); Serial.flush();
    }
  }
}