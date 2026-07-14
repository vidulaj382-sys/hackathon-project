# Project Gwen

Project Gwen is a Zero-Cloud AI voice-controlled mental math (Anzan) training assistant designed to run entirely offline with a stunning dark-mode dashboard.

## Problem
In an era where educational AI tools heavily rely on cloud APIs, user privacy is often compromised, and persistent internet connections are required. Furthermore, there is a lack of gamified, hands-free mental math training tools that focus on speed and accuracy without compromising local data ownership.

## Solution
Project Gwen solves this by functioning fully on-device. It uses a procedural math generation engine to provide infinite Anzan drills, transcribes user voice responses locally, and provides instantaneous feedback and MMR (Matchmaking Rating) updates. The hands-free approach allows users to train their mental math exactly like an Abacus professional.

## On Device AI Usage
Gwen runs 100% locally on the user's laptop/desktop:
- **Speech-to-Text (STT):** `Vosk API` transcribes the user's spoken answers offline.
- **Text-to-Speech (TTS):** `Kokoro-ONNX` generates high-fidelity local speech synthesis for dictating the drills.
- **Logic / Security:** `SymPy` safely generates and evaluates math expressions without vulnerable `eval()` calls. 
- **Storage:** `SQLCipher` maintains a secure, AES-256 encrypted local database for user progress.

## Tech Stack
- **Backend:** Python, Flask, asyncio
- **AI Models:** Vosk (STT), Kokoro-ONNX (TTS)
- **Database:** SQLite / pysqlcipher3
- **Frontend:** React, Vite, TypeScript, Tailwind CSS, GSAP, Framer Motion

## Setup and Usage

### Prerequisites
Before setting up the project, make sure you have:
- **Python 3.8+** installed.
- **Node.js (v18+)** installed.
- **PortAudio** installed on your system (only required for Linux/macOS; Windows includes PortAudio binaries in the `sounddevice` package):
  - On Ubuntu/Debian: `sudo apt-get install portaudio19-dev`
  - On macOS (via Homebrew): `brew install portaudio`

### 1. Backend Setup
1. Navigate to the `backend` directory.
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   .\venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. **Download the offline AI speech models** (required before running the server):
   ```bash
   python download_models.py
   ```
   *Note: This script downloads the local Kokoro-ONNX voice files and the Vosk speech-to-text models.*
5. Run the backend server:
   ```bash
   python main.py
   ```

### 2. Frontend Setup
1. Navigate to the `frontend` directory.
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Run the Vite development server:
   ```bash
   npm run dev
   ```

## Demo and Screenshots
*(Coming soon: Links to the Demo video and dashboard screenshots will be placed here prior to the final submission)*

## License
This project is licensed under the MIT License.
