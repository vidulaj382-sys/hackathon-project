import os
import sounddevice as sd
from kokoro_onnx import Kokoro

class TTSEngine:
    def __init__(self):
        backend_dir = os.path.dirname(__file__)
        model_path = os.path.join(backend_dir, "models", "kokoro-v1.0.int8.onnx")
        voices_path = os.path.join(backend_dir, "models", "voices-v1.0.bin")
        
        if not os.path.exists(model_path) or not os.path.exists(voices_path):
            raise FileNotFoundError("Kokoro model files not found. Run download_models.py first.")
            
        print("Initializing Kokoro TTS engine...")
        self.kokoro = Kokoro(model_path, voices_path)
        self.voice = "af_sarah" # A pleasant female voice
        
    def speak(self, text):
        try:
            print(f"Synthesizing: '{text}'")
            samples, sample_rate = self.kokoro.create(
                text,
                voice=self.voice,
                speed=1.0,
                lang="en-us"
            )
            print("Playing synthesized speech...")
            sd.play(samples, sample_rate)
            sd.wait() # Wait for playback to finish
            print("Playback finished.")
        except Exception as e:
            print(f"Error in TTS execution: {e}")

if __name__ == "__main__":
    try:
        tts = TTSEngine()
        tts.speak("Hello, I am Gwen. Your mental math trainer is ready.")
    except Exception as e:
        print(f"Failed to run TTS: {e}")
