# Project Gwen Rule Book

## Core Rules & Philosophy

1. **Zero-Cloud & 100% Local Execution:** Project Gwen must operate entirely on the user's local machine. No data should be sent to the cloud. All audio processing, logic, and storage must be done offline to guarantee maximum user privacy.
2. **Secure by Design:** All math generation and evaluation must be safely handled (e.g., using `SymPy`) to avoid vulnerable code executions like `eval()`.
3. **Data Privacy:** User data and progress (like MMR) must be stored locally in an encrypted format using `SQLCipher` with AES-256 encryption.
4. **Hands-Free Training Focus:** The system is designed for speed and accuracy in mental math (Anzan) training, functioning exactly like an Abacus professional without requiring manual input.
5. **Aesthetics & UI:** The dashboard must maintain a stunning, dynamic dark-mode aesthetic with smooth interactions using modern design principles.

## Module & Dependency Setup for New Devices

When setting up Project Gwen on a new device, the following components and AI models must be downloaded and configured locally:

### 1. System Requirements
- **Python 3.8+**
- **Node.js (v18+)**
- **PortAudio**: Required for macOS/Linux (Windows users have it bundled with `sounddevice`).
  - *Ubuntu/Debian:* `sudo apt-get install portaudio19-dev`
  - *macOS:* `brew install portaudio`

### 2. Frontend Dependencies
The React/Vite web application requires its node modules:
- Run `npm install` inside the `frontend` directory.

### 3. Backend & AI Modules
The Python backend manages the local AI and database execution.
- Set up a virtual environment and run `pip install -r requirements.txt` inside the `backend` directory.

### 4. Critical AI Models to Download Offline
Before running the backend server, the offline AI models must be fetched onto the machine:
- Run `python download_models.py` in the `backend` directory.
- **Vosk STT Models:** Required for the Speech-to-Text transcription of the user's spoken answers.
- **Kokoro-ONNX Models:** Required for the Text-to-Speech high-fidelity local speech synthesis.

Failure to download these models will result in the offline voice-assistant failing to function.

## Execution Order
1. Ensure all models are downloaded (`python download_models.py`).
2. Start the backend local server (`python main.py`).
3. Start the frontend development server (`npm run dev`).
