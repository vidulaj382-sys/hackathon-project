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

## Sample Inputs and Expected Outputs
- **Expected Output (TTS):** "What is twelve plus seven?"
- **Sample Input (User Voice):** "Nineteen."
- **Expected Output (System):** The backend validates `19 == (12 + 7)` via SymPy, plays a success chime, updates the local MMR in SQLCipher, and synthesizes the next drill.

## Demo and Screenshots - (Dual Interface)

### Demo Video
*(Add your Unstop final submission YouTube/Drive video link here!)*

### Screenshots
Modern Layout:
<img width="1896" height="905" alt="Screenshot 2026-07-14 231038" src="https://github.com/user-attachments/assets/6fcbec7b-3df0-4a21-8989-4b92cf1270a3" />
Retro Layout:
<img width="1897" height="906" alt="Screenshot 2026-07-14 231142" src="https://github.com/user-attachments/assets/49afb6c0-cf7a-43fb-bf98-62eea508032e" />
Some more features:
( here are some screenshots of retro theme)
<img width="1901" height="903" alt="Screenshot 2026-07-14 231225" src="https://github.com/user-attachments/assets/80e151ef-620e-4ba1-a9ac-d8a01ece541c" />
<img width="1901" height="907" alt="Screenshot 2026-07-14 231251" src="https://github.com/user-attachments/assets/6deab33d-22d7-457e-93a2-01e48848d31c" />
(these are some screenshots of modern theme)
<img width="1896" height="907" alt="image" src="https://github.com/user-attachments/assets/1e5b5e97-aadd-4909-aeac-2236a2be42d8" />
( we have tried to cover all the features through both the layout )

### Future Scope

* AI-based personalized learning for every student.
* Real-time finger tracking using a webcam.
* Voice-controlled learning with speech recognition.
* Support for multiple regional languages.
* Advanced levels including multiplication, division, and Anzan.
* Teacher and parent dashboard for performance tracking.
* Gamification with badges, leaderboards, and daily challenges.
* Offline and cloud synchronization across devices.
* AR/VR-based interactive learning experience.
* AI analytics to identify weak areas and recommend practice.
* Online competitions and digital certificates.
* Integration with wearable devices for smart learning.
* Selling model and its price as 299.
* Webcam test, boss fights, and weekly fights for ultimate engagement.
* AI analysis for detailed progress tracking.

## License
This project is licensed under the MIT License.
