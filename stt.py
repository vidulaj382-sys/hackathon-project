import os
import sys
import queue
import json
import sounddevice as sd
from vosk import Model, KaldiRecognizer

class STTEngine:
    def __init__(self):
        backend_dir = os.path.dirname(__file__)
        model_path = os.path.join(backend_dir, "models", "vosk-model-small-en-us-0.15")
        
        if not os.path.exists(model_path):
            raise FileNotFoundError("Vosk model files not found. Run download_models.py first.")
            
        print("Initializing Vosk STT engine...")
        self.model = Model(model_path)
        self.audio_queue = queue.Queue()
        self.listening = False

    def _audio_callback(self, indata, frames, time, status):
        if status:
            print(f"Audio status warning: {status}", file=sys.stderr)
        self.audio_queue.put(bytes(indata))

    def listen(self, callback_on_word, stop_condition_fn=None):
        """
        Starts listening to the microphone.
        callback_on_word: function called with (text, is_final).
        stop_condition_fn: function returning True to stop listening.
        """
        self.listening = True
        self.audio_queue.queue.clear()
        
        # Determine sample rate
        try:
            device_info = sd.query_devices(None, 'input')
            samplerate = int(device_info['default_samplerate'])
        except Exception as e:
            print(f"Error querying input audio device: {e}")
            samplerate = 16000 # Fallback
            
        recognizer = KaldiRecognizer(self.model, samplerate)
        recognizer.SetWords(True)
        
        print(f"Microphone recording started at {samplerate}Hz...")
        
        try:
            with sd.RawInputStream(
                samplerate=samplerate,
                blocksize=8000,
                device=None,
                dtype='int16',
                channels=1,
                callback=self._audio_callback
            ):
                while self.listening:
                    if stop_condition_fn and stop_condition_fn():
                        break
                        
                    try:
                        data = self.audio_queue.get(timeout=0.1)
                    except queue.Empty:
                        continue
                        
                    if recognizer.AcceptWaveform(data):
                        result = json.loads(recognizer.Result())
                        text = result.get("text", "")
                        if text:
                            callback_on_word(text, is_final=True)
                    else:
                        partial = json.loads(recognizer.PartialResult())
                        partial_text = partial.get("partial", "")
                        if partial_text:
                            callback_on_word(partial_text, is_final=False)
        except Exception as e:
            print(f"Error in STT stream: {e}")
        finally:
            print("Microphone recording stopped.")
            self.listening = False

    def stop(self):
        self.listening = False

if __name__ == "__main__":
    try:
        stt = STTEngine()
        print("Say something (will print recognition live)... Press Ctrl+C to exit.")
        def callback(text, is_final):
            status = "[FINAL]" if is_final else "[PARTIAL]"
            print(f"{status}: {text}")
        stt.listen(callback)
    except KeyboardInterrupt:
        print("\nExiting.")
    except Exception as e:
        print(f"Failed to run STT: {e}")
