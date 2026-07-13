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
4. Run the backend server:
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
## Dashboard Screenshots
<img width="1850" height="897" alt="image" src="https://github.com/user-attachments/assets/d21e25a2-d534-4554-99f5-b59fd9dcd2b5" />
<img width="1752" height="900" alt="image" src="https://github.com/user-attachments/assets/4e67ff93-deb5-4419-8a47-aa4647eda374" />

## Demo 
*(Coming soon: Links to the Demo video will be placed here prior to the final submission)*

## License
This project is licensed under the MIT License.
