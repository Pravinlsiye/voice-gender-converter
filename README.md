# Voice Gender Converter

A web application that allows users to convert voice recordings between male and female voices using pitch shifting technology.

## Features

- Upload audio files for gender conversion
- Record audio directly in the browser
- Convert between male and female voices
- Custom pitch adjustment
- Download both original and converted recordings
- Automatic file cleanup after 24 hours

## Technologies Used

- Python Flask for the backend
- Web Audio API for recording
- RecordRTC for MP3 encoding
- Librosa for audio processing
- HTML5, CSS3, and JavaScript for the frontend

## Getting Started

### Prerequisites

- Python 3.7+
- pip (Python package manager)

### Installation

1. Clone the repository
```bash
git clone https://github.com/Pravinlsiye/voice-gender-converter.git
cd voice-gender-converter


2. Install Python dependencies
```bash
pip install -r requirements.txt
 ```

3. Install JavaScript dependencies
```bash
npm install
 ```

### Running the Application
Start the Flask server:

```bash
python app.py
 ```

The application will be available at http://localhost:5000

## Usage
1. Upload Audio : Select an audio file from your device
2. Record Audio : Record directly from your microphone
3. Choose Conversion Type : Select male-to-female, female-to-male, or custom pitch
4. Convert : Process the audio with the selected settings
5. Download : Save the converted audio file